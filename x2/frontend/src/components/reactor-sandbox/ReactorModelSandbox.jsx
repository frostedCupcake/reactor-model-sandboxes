"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/media";
import { REACTOR_MODELS } from "@/lib/reactor-models";
import { loadModel } from "@/model-loader";
import {
  createPromptHistoryEntry,
  deleteReactorWorkspaceFile,
  PROMPT_HISTORY_LIMIT,
  readReactorWorkspace,
  readReactorWorkspaceFile,
  saveReactorWorkspaceFile,
  writeReactorWorkspace,
} from "@/lib/reactor-workspace-storage";

const REACTOR_BACKEND_URL = (import.meta.env.VITE_REACTOR_BACKEND_URL || "http://localhost:8787").replace(/\/$/, "");
const reactorApiUrl = (path) => `${REACTOR_BACKEND_URL}${path}`;

function Link({ href, children, ...props }) {
  return <a href={href} {...props}>{children}</a>;
}

const BUILD_ONE_CLIP =
  "[clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]";
const BUILD_ONE_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white";

const WORLD_REFERENCES = {
  x2: ["x2.jpg", "lingbot.jpg", "helios.jpg"],
  "happy-oyster": ["happy-oyster.jpg", "lingbot-world-2.jpg", "helios.jpg", "sana-streaming.jpg"],
  "lingbot-world-2": ["lingbot-world-2.jpg", "lingbot.jpg", "happy-oyster.jpg"],
  lingbot: ["lingbot.jpg", "longlive-v2.jpg", "helios.jpg", "happy-oyster.jpg"],
  helios: ["helios.jpg", "happy-oyster.jpg"],
};

export default function ReactorModelSandbox({ model }) {
  const [prompt, setPrompt] = useState(model.prompt);
  const [status, setStatus] = useState("ready");
  const [connectionStage, setConnectionStage] = useState("");
  const [error, setError] = useState("");
  const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
  const [isKeyStatusLoaded, setIsKeyStatusLoaded] = useState(false);
  const [keyExpiresAt, setKeyExpiresAt] = useState(null);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyDialogError, setKeyDialogError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState("adventure");
  const [rotationSpeed, setRotationSpeed] = useState(5);
  const [referenceFile, setReferenceFile] = useState(null);
  const [referencePreview, setReferencePreview] = useState("");
  const [selectedReferenceName, setSelectedReferenceName] = useState(WORLD_REFERENCES[model.slug]?.[0] || "");
  const [sourceMode, setSourceMode] = useState("webcam");
  const [videoClipName, setVideoClipName] = useState("");
  const [videoClipUrl, setVideoClipUrl] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [scenes, setScenes] = useState([]);
  const [promptHistory, setPromptHistory] = useState([]);
  const [isPromptHistoryOpen, setIsPromptHistoryOpen] = useState(false);
  const [isWorkspaceHydrated, setIsWorkspaceHydrated] = useState(false);
  const modelRef = useRef(null);
  const streamRef = useRef(null);
  const outputVideoRef = useRef(null);
  const sourceVideoRef = useRef(null);
  const isPointerDownRef = useRef(false);
  const statusRef = useRef("ready");
  const startupErrorRef = useRef("");
  const startAttemptRef = useRef(0);
  const pendingJwtRef = useRef("");
  const restoreSessionRef = useRef(false);
  const restoreAttemptedRef = useRef(false);

  const isLive = status === "live";
  const isBusy = status === "connecting";

  const updateStatus = useCallback((nextStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const stopModel = useCallback(async (options = {}) => {
    if (options?.preserveRestoreState !== true) restoreSessionRef.current = false;
    startAttemptRef.current += 1;
    const activeModel = modelRef.current;
    modelRef.current = null;
    if (activeModel) {
      await activeModel.reset?.().catch(() => {});
      await activeModel.endTravelSession?.().catch(() => {});
      await activeModel.unpublishSource?.().catch(() => {});
      await activeModel.unpublishCamera?.().catch(() => {});
      await activeModel.disconnect?.().catch(() => {});
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (sourceVideoRef.current) {
      sourceVideoRef.current.pause();
      sourceVideoRef.current.srcObject = null;
    }
    if (outputVideoRef.current) outputVideoRef.current.srcObject = null;
    setCameraEnabled(false);
    setConnectionStage("");
    updateStatus("ready");
    setIsPaused(false);
  }, [updateStatus]);

  useEffect(() => () => void stopModel({ preserveRestoreState: true }), [stopModel]);
  useEffect(() => {
    void loadKeyStatus();
  }, []);
  useEffect(() => {
    if (!keyExpiresAt) return undefined;
    const timeout = window.setTimeout(() => {
      setHasSavedApiKey(false);
      setKeyExpiresAt(null);
    }, Math.max(0, keyExpiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [keyExpiresAt]);
  useEffect(() => {
    if (!toastMessage) return undefined;
    const timeout = window.setTimeout(() => setToastMessage(""), 4_000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);
  useEffect(() => {
    let cancelled = false;
    restoreAttemptedRef.current = false;
    setIsWorkspaceHydrated(false);
    const hydrateWorkspace = async () => {
      const saved = readReactorWorkspace(model.slug);
      const history = Array.isArray(saved?.promptHistory)
        ? saved.promptHistory.filter((entry) => typeof entry?.prompt === "string").slice(0, PROMPT_HISTORY_LIMIT)
        : [];
      const savedReference = saved?.referenceSource === "upload"
        ? await readReactorWorkspaceFile(model.slug, "reference").catch(() => null)
        : null;
      const savedVideo = saved?.sourceMode === "video"
        ? await readReactorWorkspaceFile(model.slug, "video").catch(() => null)
        : null;
      if (cancelled) return;
      setPrompt(typeof saved?.prompt === "string" ? saved.prompt : model.prompt);
      setPromptHistory(history);
      setMode(saved?.mode === "directing" ? "directing" : "adventure");
      setRotationSpeed(Number.isFinite(Number(saved?.rotationSpeed)) ? Number(saved.rotationSpeed) : 5);
      setScenes(Array.isArray(saved?.scenes) ? saved.scenes.filter((scene) => typeof scene?.prompt === "string") : []);
      setReferenceFile(savedReference);
      setReferencePreview(savedReference ? URL.createObjectURL(savedReference) : "");
      setSelectedReferenceName(savedReference?.name || saved?.selectedReferenceName || WORLD_REFERENCES[model.slug]?.[0] || "");
      setSourceMode(savedVideo ? "video" : "webcam");
      setVideoClipName(savedVideo?.name || "");
      setVideoClipUrl(savedVideo ? URL.createObjectURL(savedVideo) : "");
      setCameraEnabled(false);
      restoreSessionRef.current = Boolean(saved?.shouldRestoreSession);
      setIsWorkspaceHydrated(true);
    };
    void hydrateWorkspace();
    return () => {
      cancelled = true;
    };
  }, [model.prompt, model.slug]);

  useEffect(() => {
    if (!isWorkspaceHydrated) return;
    writeReactorWorkspace(model.slug, {
      prompt,
      promptHistory,
      mode,
      rotationSpeed,
      scenes,
      referenceSource: referenceFile ? "upload" : "builtin",
      selectedReferenceName,
      sourceMode,
      videoClipName,
      shouldRestoreSession: restoreSessionRef.current || status === "live" || status === "connecting",
    });
  }, [isWorkspaceHydrated, mode, model.slug, prompt, promptHistory, referenceFile, rotationSpeed, scenes, selectedReferenceName, sourceMode, status, videoClipName]);

  useEffect(() => {
    if (!isWorkspaceHydrated || !isKeyStatusLoaded || restoreAttemptedRef.current || !restoreSessionRef.current) return;
    restoreAttemptedRef.current = true;
    if (!hasSavedApiKey) {
      restoreSessionRef.current = false;
      setToastMessage("Your previous workspace was restored. Start again to reconnect the model.");
      return;
    }
    setToastMessage("Restoring your previous session…");
    const timeout = window.setTimeout(() => void startModel({ skipKeyCheck: true, restorePaused: true }), 0);
    return () => window.clearTimeout(timeout);
  }, [hasSavedApiKey, isKeyStatusLoaded, isWorkspaceHydrated, model.slug]);

  useEffect(() => {
    if (!isPromptHistoryOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsPromptHistoryOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isPromptHistoryOpen]);

  useEffect(() => () => {
    if (referencePreview) URL.revokeObjectURL(referencePreview);
  }, [referencePreview]);

  useEffect(() => () => {
    if (videoClipUrl) URL.revokeObjectURL(videoClipUrl);
  }, [videoClipUrl]);

  async function loadKeyStatus() {
    const response = await fetch(reactorApiUrl("/api/reactor/key"), {
      cache: "no-store",
      credentials: "include",
    });
    const data = await response.json().catch(() => null);
    const saved = Boolean(response.ok && data?.saved);
    setHasSavedApiKey(saved);
    setKeyExpiresAt(saved ? data.expiresAt : null);
    setIsKeyStatusLoaded(true);
    return saved;
  }

  async function getToken(options = {}) {
    if (pendingJwtRef.current) {
      const jwt = pendingJwtRef.current;
      pendingJwtRef.current = "";
      return jwt;
    }
    const response = await fetch(reactorApiUrl("/api/reactor/token"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: model.slug, mode }),
    });
    const data = await response.json().catch(() => null);
    if (response.status === 429 && options?.retryOnRateLimit) {
      setConnectionStage("Waiting to reconnect");
      await new Promise((resolve) => window.setTimeout(resolve, Math.max(250, Number(data?.retryAfterMs) || 10_000)));
      return getToken({ retryOnRateLimit: false });
    }
    if (!response.ok || !data?.jwt) {
      const tokenError = new Error(data?.error || "Could not start a Reactor session.");
      tokenError.requiresApiKey = Boolean(data?.requiresApiKey);
      throw tokenError;
    }
    return data.jwt;
  }

  function attachModelEvents(activeModel) {
    activeModel.on?.("trackReceived", (name, _track, stream) => {
      if (name !== "main_video" || !outputVideoRef.current) return;
      outputVideoRef.current.srcObject = stream;
      void outputVideoRef.current.play();
    });
    activeModel.onMainVideo?.((_track, stream) => {
      if (!outputVideoRef.current) return;
      outputVideoRef.current.srcObject = stream;
      void outputVideoRef.current.play();
    });
    subscribeModelMessages(activeModel, (message) => {
      if (message?.type === "command_error") {
        const reason = message.reason || "The model rejected that command.";
        startupErrorRef.current = reason;
        setError(reason);
        if (statusRef.current === "connecting") updateStatus("ready");
      }
      if (message?.type === "generation_started" || (message?.type === "state" && message.started)) {
        setConnectionStage("");
        updateStatus("live");
      }
      if (message?.type === "generation_paused" || (message?.type === "state" && message.paused === true)) setIsPaused(true);
      if (message?.type === "generation_resumed" || (message?.type === "state" && message.paused === false && message.started)) setIsPaused(false);
    });
    activeModel.onPhaseChanged?.((phase) => {
      if (phase === "streaming") updateStatus("live");
    });
  }

  async function getReferenceBlob() {
    if (referenceFile) return referenceFile;
    if (!selectedReferenceName) return null;
    const response = await fetch(mediaUrl(`/models/${selectedReferenceName}`), { cache: "reload" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new File([blob], selectedReferenceName, { type: blob.type || "image/jpeg" });
  }

  async function uploadReference(activeModel, image) {
    if (!image || !activeModel.uploadFile) return;
    const uploaded = await activeModel.uploadFile(image, { name: image.name });
    const acceptedType = model.slug === "x2" ? "reference_image_accepted" : "image_accepted";
    const accepted = waitForModelMessage(activeModel, (message) => message?.type === acceptedType);
    if (model.slug === "x2" && activeModel.setReferenceImage) {
      await activeModel.setReferenceImage({ reference_image: uploaded });
    } else if (activeModel.setImage) {
      await activeModel.setImage({ image: uploaded });
    }
    await accepted;
  }

  async function enableCamera() {
    setError("");
    try {
      setSourceMode("webcam");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (sourceVideoRef.current) {
        sourceVideoRef.current.srcObject = stream;
        await sourceVideoRef.current.play();
      }
      setCameraEnabled(true);
    } catch (cameraError) {
      setError(cameraError?.message || "Camera access was not granted.");
    }
  }

  async function prepareVideoClip() {
    const video = sourceVideoRef.current;
    if (!videoClipUrl || !video) throw new Error("Choose a video clip before starting the model.");
    const captureStream = video.captureStream || video.mozCaptureStream;
    if (!captureStream) throw new Error("Video clips are not supported by this browser. Use a webcam instead.");
    video.currentTime = 0;
    await video.play();
    const stream = captureStream.call(video);
    const track = stream.getVideoTracks()[0];
    if (!track) throw new Error("The selected video clip could not be read.");
    streamRef.current?.getTracks().forEach((currentTrack) => currentTrack.stop());
    streamRef.current = stream;
    setCameraEnabled(true);
  }

  async function startModel(options = {}) {
    const restart = options?.restart === true;
    const skipKeyCheck = options?.skipKeyCheck === true;
    const restorePaused = options?.restorePaused === true;
    if (!prompt.trim() || isBusy || (isLive && !restart)) return;
    const hasKey = isKeyStatusLoaded ? hasSavedApiKey : await loadKeyStatus().catch(() => false);
    if (!skipKeyCheck && !hasKey) {
      setKeyDialogError("");
      setIsKeyDialogOpen(true);
      return;
    }
    setError("");
    startupErrorRef.current = "";
    const attemptId = startAttemptRef.current + 1;
    startAttemptRef.current = attemptId;
    const ensureAttemptIsActive = () => {
      if (startAttemptRef.current !== attemptId) throw new DOMException("Connection cancelled", "AbortError");
    };
    setConnectionStage("Connecting to Reactor");
    restoreSessionRef.current = true;
    setIsPaused(false);
    updateStatus("connecting");
    try {
      const loadSelectedModel = globalThis.__REACTOR_TEST_MODEL_LOADER__ || (() => loadModel());
      const [{ module, className }, jwt] = await Promise.all([loadSelectedModel(model.slug), getToken({ retryOnRateLimit: restorePaused })]);
      let activeModel;
      if (model.slug === "happy-oyster") {
        activeModel = new module[className]({ mode, videoElement: outputVideoRef.current });
      } else {
        activeModel = new module[className]();
      }
      modelRef.current = activeModel;
      attachModelEvents(activeModel);
      await activeModel.connect(jwt);
      ensureAttemptIsActive();
      if (activeModel.getStatus && activeModel.getStatus() !== "ready") await waitForReady(activeModel);
      ensureAttemptIsActive();

      if (model.slug === "x2" || model.slug === "sana-streaming") {
        setConnectionStage(sourceMode === "video" ? "Preparing video clip" : "Preparing webcam");
        if (!streamRef.current) {
          if (sourceMode === "video") await prepareVideoClip();
          else await enableCamera();
        }
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) throw new Error(sourceMode === "video" ? "Choose a video clip before starting the model." : "Enable your camera before starting the model.");
        if (model.slug === "x2") {
          await activeModel.publishSource(track);
          await activeModel.setKeepBacklog({ keep_backlog: false });
          setConnectionStage("Uploading reference image");
          await uploadReference(activeModel, await getReferenceBlob());
          ensureAttemptIsActive();
          setConnectionStage("Setting prompt");
          await activeModel.setPrompt({ prompt: prompt.trim() });
        } else {
          await activeModel.publishCamera(track);
          await activeModel.setPrompt({ prompt: prompt.trim() });
          await activeModel.start();
        }
      } else if (model.slug === "happy-oyster") {
        setConnectionStage("Preparing reference image");
        const image = await getReferenceBlob();
        setConnectionStage("Creating world");
        await activeModel.createWorld({
          prompt: prompt.trim(),
          ...(image ? { firstFrameImage: image } : {}),
          ...(mode === "adventure" ? { perspective: "third_person" } : { resolution: "720p", layout: "Stable", narrative: "Normal" }),
        });
        await activeModel.startTravel();
      } else if (model.slug === "longlive-v2") {
        setConnectionStage("Setting opening shot");
        await activeModel.setShot({ prompt: prompt.trim() });
        setConnectionStage("Starting generation");
        await activeModel.start();
        if (!restorePaused) setScenes([{ prompt: prompt.trim(), at: 0 }]);
      } else {
        setConnectionStage("Uploading reference image");
        const image = await getReferenceBlob();
        await uploadReference(activeModel, image);
        ensureAttemptIsActive();
        setConnectionStage("Setting prompt");
        await activeModel.setPrompt({ prompt: prompt.trim() });
        if (model.family === "world" && activeModel.setRotationSpeedDeg) {
          await activeModel.setRotationSpeedDeg({ rotation_speed_deg: Number(rotationSpeed) });
        }
        setConnectionStage("Starting generation");
        await activeModel.start();
      }
      ensureAttemptIsActive();
      setConnectionStage("Waiting for first frames");
      await waitForSessionLive(statusRef, startupErrorRef);
      ensureAttemptIsActive();
      if (!restorePaused) rememberPrompt(prompt.trim());
      if (restorePaused) {
        setConnectionStage("Pausing restored session");
        await pauseActiveModel(activeModel);
        setIsPaused(true);
        setConnectionStage("");
        setToastMessage("Session restored and paused.");
      }
    } catch (sessionError) {
      if (startAttemptRef.current !== attemptId || sessionError?.name === "AbortError") return;
      await stopModel();
      if (sessionError?.requiresApiKey) {
        setHasSavedApiKey(false);
        setKeyExpiresAt(null);
        setIsKeyDialogOpen(true);
      } else {
        setError(sessionError?.message || "The model session could not start.");
      }
    }
  }

  async function saveApiKeyAndStart(event) {
    event.preventDefault();
    if (!apiKeyDraft.trim()) return;
    setIsSavingKey(true);
    setKeyDialogError("");
    try {
      const response = await fetch(reactorApiUrl("/api/reactor/key"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyDraft.trim(), model: model.slug, mode }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.saved || !data?.jwt) throw new Error(data?.error || "The API key could not be saved.");
      pendingJwtRef.current = data.jwt;
      setHasSavedApiKey(true);
      setIsKeyStatusLoaded(true);
      setKeyExpiresAt(data.expiresAt);
      setApiKeyDraft("");
      setIsKeyDialogOpen(false);
      setToastMessage("API key saved securely for 30 minutes.");
      await startModel({ skipKeyCheck: true });
    } catch (saveError) {
      setKeyDialogError(saveError?.message || "The API key could not be saved.");
    } finally {
      setIsSavingKey(false);
    }
  }

  async function togglePause() {
    const activeModel = modelRef.current;
    if (!activeModel) return;
    const shouldResume = isPaused;
    try {
      if (shouldResume) await resumeActiveModel(activeModel);
      else await pauseActiveModel(activeModel);
      setIsPaused(!shouldResume);
    } catch (pauseError) {
      setError(pauseError?.message || "The stream could not be paused.");
    }
  }

  async function applyPrompt() {
    const activeModel = modelRef.current;
    if (!activeModel || !prompt.trim()) return;
    setError("");
    try {
      if (model.slug === "longlive-v2") {
        await activeModel.sceneCut({ prompt: prompt.trim() });
        setScenes((current) => [...current, { prompt: prompt.trim(), at: current.length * 10 }]);
      } else if (model.slug === "happy-oyster") {
        if (mode === "directing") await activeModel.instruct(prompt.trim());
        else {
          await stopModel();
          await startModel({ restart: true });
        }
      } else if (model.slug === "x2") {
        const nextPrompt = prompt.trim();
        if (isPaused) {
          await resumeActiveModel(activeModel);
          setIsPaused(false);
        }
        const accepted = waitForModelMessage(
          activeModel,
          (message) => message?.type === "prompt_accepted" && message.prompt === nextPrompt,
          20_000,
          "X2 did not confirm the new prompt in time.",
        );
        await Promise.all([activeModel.setPrompt({ prompt: nextPrompt }), accepted]);
        await activeModel.setKeepBacklog?.({ keep_backlog: false });
        const reference = await getReferenceBlob();
        if (!reference) throw new Error("Choose a reference image before applying the X2 prompt.");
        const restarted = waitForModelMessage(
          activeModel,
          (message) => message?.type === "generation_started" && (!message.prompt || message.prompt === nextPrompt),
          60_000,
          "X2 accepted the prompt but did not restart generation.",
        );
        await Promise.all([uploadReference(activeModel, reference), restarted]);
        setToastMessage("Prompt applied. X2 restarted with your changes.");
      } else {
        await activeModel.setPrompt({ prompt: prompt.trim() });
      }
      if (!(model.slug === "happy-oyster" && mode !== "directing")) rememberPrompt(prompt.trim());
    } catch (promptError) {
      setError(promptError?.message || "The prompt could not be applied.");
    }
  }

  function rememberPrompt(value) {
    const normalized = value.trim();
    if (!normalized) return;
    setPromptHistory((current) => [createPromptHistoryEntry(normalized), ...current].slice(0, PROMPT_HISTORY_LIMIT));
  }

  async function pauseActiveModel(activeModel) {
    if (model.slug === "x2") {
      await activeModel.unpublishSource?.();
      return;
    }
    if (!activeModel.pause) throw new Error("This model does not support pausing.");
    await activeModel.pause();
  }

  async function resumeActiveModel(activeModel) {
    if (model.slug === "x2") {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) throw new Error("The saved video source is no longer available.");
      await activeModel.publishSource(track);
      await activeModel.setKeepBacklog?.({ keep_backlog: false });
      return;
    }
    if (!activeModel.resume) throw new Error("This model does not support resuming.");
    await activeModel.resume();
  }

  async function sendWorldControl(type, value, active) {
    const activeModel = modelRef.current;
    if (!activeModel || !isLive || isPaused) return;
    try {
      if (model.slug === "happy-oyster") {
        if (active) {
          if (type === "move") await activeModel.move(value);
          else await activeModel.look(value);
        } else {
          await activeModel.release(type === "move" ? { translation: true } : { rotation: true });
        }
      } else if (model.slug === "lingbot-world-2") {
        const payloads = {
          forward: ["setMoveLongitudinal", { move_longitudinal: active ? "forward" : "idle" }],
          back: ["setMoveLongitudinal", { move_longitudinal: active ? "back" : "idle" }],
          strafe_left: ["setMoveLateral", { move_lateral: active ? "strafe_left" : "idle" }],
          strafe_right: ["setMoveLateral", { move_lateral: active ? "strafe_right" : "idle" }],
          left: ["setLookHorizontal", { look_horizontal: active ? "left" : "idle" }],
          right: ["setLookHorizontal", { look_horizontal: active ? "right" : "idle" }],
          up: ["setLookVertical", { look_vertical: active ? "up" : "idle" }],
          down: ["setLookVertical", { look_vertical: active ? "down" : "idle" }],
        };
        const [method, payload] = payloads[value];
        await activeModel[method](payload);
      } else {
        if (type === "move") await activeModel.setMovement({ movement: active ? value : "idle" });
        else if (["left", "right"].includes(value)) await activeModel.setLookHorizontal({ look_horizontal: active ? value : "idle" });
        else await activeModel.setLookVertical({ look_vertical: active ? value : "idle" });
      }
    } catch (controlError) {
      setError(controlError?.message || "That control could not be applied.");
    }
  }

  async function handleReference(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setReferenceFile(file);
    setReferencePreview(URL.createObjectURL(file));
    setSelectedReferenceName(file.name);
    try {
      await saveReactorWorkspaceFile(model.slug, "reference", file);
    } catch {
      setError("The reference is selected, but it could not be saved for refresh recovery.");
    }
    if (model.slug === "x2" && isLive) {
      try {
        await uploadReference(modelRef.current, file);
      } catch (referenceError) {
        setError(referenceError?.message || "The reference image could not be applied.");
      }
    }
  }

  async function selectBuiltInReference(image) {
    setReferenceFile(null);
    setReferencePreview("");
    setSelectedReferenceName(image);
    void deleteReactorWorkspaceFile(model.slug, "reference").catch(() => {});
    if (model.slug === "x2" && isLive) {
      try {
        const response = await fetch(mediaUrl(`/models/${image}`), { cache: "reload" });
        if (!response.ok) throw new Error("The reference image could not be loaded.");
        const blob = await response.blob();
        await uploadReference(modelRef.current, new File([blob], image, { type: blob.type || "image/jpeg" }));
      } catch (referenceError) {
        setError(referenceError?.message || "The reference image could not be applied.");
      }
    }
  }

  async function handleVideoClip(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (sourceVideoRef.current) sourceVideoRef.current.srcObject = null;
    setCameraEnabled(false);
    setSourceMode("video");
    setVideoClipName(file.name);
    setVideoClipUrl(URL.createObjectURL(file));
    event.target.value = "";
    try {
      await saveReactorWorkspaceFile(model.slug, "video", file);
    } catch {
      setError("The video is selected, but it could not be saved for refresh recovery.");
    }
  }

  async function clearVideoClip() {
    if (isLive || isBusy) await stopModel();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (sourceVideoRef.current) {
      sourceVideoRef.current.pause();
      sourceVideoRef.current.srcObject = null;
      sourceVideoRef.current.removeAttribute("src");
      sourceVideoRef.current.load();
    }
    setCameraEnabled(false);
    setVideoClipName("");
    setVideoClipUrl("");
    setSourceMode("webcam");
    await deleteReactorWorkspaceFile(model.slug, "video").catch(() => {});
  }

  function selectWebcam() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (sourceVideoRef.current) sourceVideoRef.current.srcObject = null;
    setCameraEnabled(false);
    setSourceMode("webcam");
  }

  async function handleOutputPointer(event, isActive) {
    const activeModel = modelRef.current;
    if (model.slug !== "x2" || !isLive || isPaused || !activeModel?.setPointer) return;
    try {
      const bounds = event.currentTarget.getBoundingClientRect();
      const pointerX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      const pointerY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
      isPointerDownRef.current = isActive;
      await activeModel.setPointer({ pointer_x: pointerX, pointer_y: pointerY, pointer_active: isActive });
    } catch (pointerError) {
      setError(pointerError?.message || "The pointer position could not be applied.");
    }
  }

  useEffect(() => {
    const canUseKeyboard = isLive && !isPaused && (model.family === "world" || (model.family === "happy" && mode === "adventure"));
    if (!canUseKeyboard) return undefined;

    const heldKeys = new Map();
    const keyMap = {
      w: ["move", model.slug === "happy-oyster" ? "Front" : "forward"],
      a: ["move", model.slug === "happy-oyster" ? "Left" : "strafe_left"],
      s: ["move", model.slug === "happy-oyster" ? "Back" : "back"],
      d: ["move", model.slug === "happy-oyster" ? "Right" : "strafe_right"],
      arrowup: ["look", "up"],
      arrowleft: ["look", "left"],
      arrowdown: ["look", "down"],
      arrowright: ["look", "right"],
    };
    const isTyping = (target) => ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) || target?.isContentEditable;
    const handleKeyDown = (event) => {
      if (isTyping(event.target)) return;
      const control = keyMap[event.key.toLowerCase()];
      if (!control || heldKeys.has(event.key.toLowerCase())) return;
      event.preventDefault();
      heldKeys.set(event.key.toLowerCase(), control);
      void sendWorldControl(control[0], control[1], true);
    };
    const handleKeyUp = (event) => {
      const control = heldKeys.get(event.key.toLowerCase());
      if (!control) return;
      event.preventDefault();
      heldKeys.delete(event.key.toLowerCase());
      void sendWorldControl(control[0], control[1], false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      heldKeys.forEach((control) => void sendWorldControl(control[0], control[1], false));
    };
  }, [isLive, isPaused, mode, model.family, model.slug]);

  return (
    <main className="min-h-screen bg-[#faf5f2] text-[#5f6d72]">
      <div className="px-4 pb-8 pt-7 sm:px-8 lg:px-12 lg:pb-6 lg:pt-6">
        <div className="mx-auto max-w-[1344px]">
          <header>
            <div className="flex flex-wrap items-end gap-4">
              <h1 className="font-display text-[clamp(2.75rem,4.5vw,3.75rem)] font-extrabold leading-none tracking-[-0.055em] text-[#143d50]">{model.name}</h1>
              <span className={`mb-1 bg-[#cf6d88] px-2.5 py-1.5 font-mono text-[11px] font-medium text-white ${BUILD_ONE_CLIP}`}>{model.price}</span>
              {model.offer && <span className="mb-1 bg-[#143d50]/[0.07] px-2.5 py-1.5 font-mono text-[11px] text-[#143d50]">{model.offer}</span>}
            </div>
            <p className="mt-2 max-w-5xl text-[clamp(1.125rem,2vw,1.375rem)] leading-tight tracking-[-0.025em]">{model.description}</p>
          </header>

          <div data-testid="model-workspace" className="mt-6 grid min-h-[680px] overflow-hidden rounded-2xl border border-[#143d50]/10 bg-white shadow-[0_24px_60px_-36px_rgba(20,61,80,0.4)] lg:h-[calc(100dvh-240px)] lg:min-h-[620px] lg:grid-cols-[338px_minmax(0,1fr)]">
            <aside className="border-b border-[#143d50]/10 bg-white lg:overflow-y-auto lg:border-b-0 lg:border-r">
              <ControlPanel
                model={model}
                prompt={prompt}
                setPrompt={setPrompt}
                mode={mode}
                setMode={setMode}
                referencePreview={referencePreview}
                selectedReferenceName={selectedReferenceName}
                selectBuiltInReference={selectBuiltInReference}
                handleReference={handleReference}
                sourceMode={sourceMode}
                videoClipName={videoClipName}
                handleVideoClip={handleVideoClip}
                clearVideoClip={clearVideoClip}
                selectWebcam={selectWebcam}
                cameraEnabled={cameraEnabled}
                enableCamera={enableCamera}
                startModel={startModel}
                applyPrompt={applyPrompt}
                isLive={isLive}
                isBusy={isBusy}
                error={error}
                scenes={scenes}
                promptHistory={promptHistory}
                openPromptHistory={() => setIsPromptHistoryOpen(true)}
              />
            </aside>

            <section className="flex min-h-[620px] min-w-0 flex-col bg-white lg:min-h-0">
              <div
                className={`relative flex min-h-[500px] flex-1 items-center justify-center overflow-hidden bg-[#143d50]/[0.045] lg:min-h-0 ${model.slug === "x2" && isLive ? "cursor-crosshair touch-none" : ""}`}
                onPointerDown={(event) => {
                  if (model.slug !== "x2" || !isLive) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  void handleOutputPointer(event, true);
                }}
                onPointerMove={(event) => {
                  if (isPointerDownRef.current) void handleOutputPointer(event, true);
                }}
                onPointerUp={(event) => void handleOutputPointer(event, false)}
                onPointerCancel={(event) => void handleOutputPointer(event, false)}
              >
                <video ref={outputVideoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-contain" />
                {!isLive && (
                  <div className="relative z-10 text-center text-[#143d50]/35">
                    <ReactorGlyph className="mx-auto h-7 w-7" />
                    <p className="mt-3 text-4xl font-medium tracking-[-0.04em]">{isBusy ? "Opening the model" : "Enter a prompt"}</p>
                    <p className="mt-1 text-sm">{isBusy ? `${connectionStage || "Connecting to Reactor"}…` : "Press generate to begin"}</p>
                  </div>
                )}
                {model.family === "camera" && <video ref={sourceVideoRef} src={sourceMode === "video" ? videoClipUrl : undefined} autoPlay playsInline muted loop className={`absolute bottom-3 right-3 z-20 aspect-video w-44 rounded border border-white/50 bg-black object-cover ${cameraEnabled || videoClipUrl ? "" : "invisible"}`} />}
                {model.slug === "x2" && isLive && <p className="absolute bottom-3 left-3 z-20 rounded bg-[#061a26]/90 px-3 py-2 text-xs font-semibold text-white">Drag on the video to steer the edit</p>}
              </div>
              <PlaybackBar model={model} status={status} isPaused={isPaused} canStart={Boolean(prompt.trim())} startModel={startModel} togglePause={togglePause} stopModel={stopModel} />
              {(model.family === "world" || (model.family === "happy" && mode === "adventure")) && (
                <WorldControls
                  model={model}
                  isLive={isLive && !isPaused}
                  rotationSpeed={rotationSpeed}
                  setRotationSpeed={async (value) => {
                    setRotationSpeed(value);
                    await modelRef.current?.setRotationSpeedDeg?.({ rotation_speed_deg: Number(value) });
                  }}
                  sendWorldControl={sendWorldControl}
                />
              )}
              {model.family === "storyboard" && <Timeline scenes={scenes} setPrompt={setPrompt} />}
            </section>
          </div>
        </div>
      </div>
      <ReactorFooter />
      {toastMessage && <div role="status" className="fixed right-4 top-4 z-[70] max-w-sm rounded-lg bg-[#0b2936] px-4 py-3 text-sm font-semibold text-white shadow-xl">{toastMessage}</div>}
      {isPromptHistoryOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-[#061a26]/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsPromptHistoryOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="prompt-history-title" className="flex max-h-[min(720px,85dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#faf5f2] text-[#143d50] shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-[#143d50]/10 p-5 sm:p-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#a83e62]">Workspace</p>
                <h2 id="prompt-history-title" className="font-display mt-1 text-3xl font-extrabold tracking-[-0.04em]">Prompt history</h2>
              </div>
              <button type="button" onClick={() => setIsPromptHistoryOpen(false)} aria-label="Close prompt history" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#143d50]/15 bg-white text-xl text-[#143d50] hover:border-[#cf6d88]">×</button>
            </header>
            <div className="overflow-y-auto p-3 sm:p-4">
              {promptHistory.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#143d50]/20 p-8 text-center text-sm text-[#5f6d72]">Prompts you run will appear here.</p>
              ) : (
                <ol className="grid gap-2">
                  {promptHistory.map((entry) => (
                    <li key={entry.id} className="rounded-xl border border-[#143d50]/10 bg-white p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#143d50]">{entry.prompt}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <time className="font-mono text-[10px] uppercase tracking-[0.06em] text-[#5f6d72]" dateTime={formatPromptHistoryIso(entry.createdAt)}>{formatPromptHistoryTime(entry.createdAt)}</time>
                        <button type="button" onClick={() => { setPrompt(entry.prompt); setIsPromptHistoryOpen(false); }} className="min-h-9 rounded-lg border border-[#cf6d88]/45 px-3 text-xs font-semibold text-[#a83e62] hover:border-[#cf6d88] hover:bg-[#cf6d88] hover:text-white">Use prompt</button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      )}
      {isKeyDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#061a26]/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSavingKey) setIsKeyDialogOpen(false); }}>
          <form onSubmit={saveApiKeyAndStart} role="dialog" aria-modal="true" aria-labelledby="reactor-key-title" className="w-full max-w-md rounded-2xl border border-white/15 bg-[#faf5f2] p-6 text-[#143d50] shadow-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#a83e62]">Reactor access</p>
            <h2 id="reactor-key-title" className="font-display mt-2 text-3xl font-extrabold tracking-[-0.04em]">Add Reactor API key</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5f6d72]">Your key is encrypted in a secure, HTTP-only session for 30 minutes, then expires automatically. Frontend JavaScript cannot access it.</p>
            <label className="mt-5 block">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em]">API key</span>
              <input autoFocus type="password" value={apiKeyDraft} onChange={(event) => setApiKeyDraft(event.target.value)} aria-label="Reactor API key" autoComplete="off" autoCapitalize="none" spellCheck={false} className="mt-2 min-h-12 w-full rounded-lg border border-[#143d50]/15 bg-white px-3 text-base outline-none focus:border-[#cf6d88] focus:ring-2 focus:ring-[#cf6d88]/20" />
            </label>
            {keyDialogError && <p role="alert" className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{keyDialogError}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsKeyDialogOpen(false)} disabled={isSavingKey} className="min-h-11 rounded-lg border border-[#143d50]/15 bg-white px-4 text-sm font-semibold disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={isSavingKey || !apiKeyDraft.trim()} className={`min-h-11 bg-[#cf6d88] px-4 text-sm font-semibold text-white hover:bg-[#c15c7a] disabled:opacity-45 ${BUILD_ONE_CLIP} ${BUILD_ONE_FOCUS}`}>{isSavingKey ? "Saving…" : "Save and start"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function ControlPanel({ model, prompt, setPrompt, mode, setMode, referencePreview, selectedReferenceName, selectBuiltInReference, handleReference, sourceMode, videoClipName, handleVideoClip, clearVideoClip, selectWebcam, cameraEnabled, enableCamera, startModel, applyPrompt, isLive, isBusy, error, scenes, promptHistory, openPromptHistory }) {
  const references = WORLD_REFERENCES[model.slug] || [];
  const primaryButtonLabel = isBusy ? "Starting…" : isLive ? "Apply prompt" : "Start session";
  return (
    <div>
      {model.family === "happy" && (
        <PanelSection label="Mode">
          <div className="grid grid-cols-2 rounded-xl bg-[#143d50]/[0.05] p-1">
            {[["adventure", "Adventure"], ["directing", "Directing"]].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setMode(value)} className={`min-h-10 rounded-lg text-sm font-medium transition-colors ${mode === value ? "bg-[#cf6d88] text-white" : "text-[#5f6d72] hover:text-[#143d50]"}`}>{label}</button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#5f6d72]">{mode === "adventure" ? "Use WASD to move and the arrow keys to look around." : "Apply text instructions while the story runs; pause and resume from the session bar."}</p>
        </PanelSection>
      )}
      {model.family === "camera" && (
        <PanelSection label="Source">
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={selectWebcam} aria-label="Use webcam" aria-pressed={sourceMode === "webcam"} className={`min-h-11 rounded border text-sm font-medium transition-colors ${sourceMode === "webcam" ? "border-[#143d50] bg-[#143d50]/[0.04] text-[#143d50]" : "border-[#143d50]/10 text-[#5f6d72] hover:border-[#cf6d88]/50"}`}>Webcam</button>
            <label role="button" tabIndex={0} onKeyDown={(event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); event.currentTarget.querySelector("input")?.click(); } }} aria-label="Use video clip" aria-pressed={sourceMode === "video"} className={`flex min-h-11 cursor-pointer items-center justify-center rounded border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf6d88] ${sourceMode === "video" ? "border-[#143d50] bg-[#143d50]/[0.04] text-[#143d50]" : "border-[#143d50]/10 text-[#5f6d72] hover:border-[#cf6d88]/50"}`}>
              Video clip
              <input type="file" accept="video/*" onChange={handleVideoClip} aria-label="Upload a video clip" className="sr-only" />
            </label>
          </div>
          {sourceMode === "webcam" ? (
            <button type="button" onClick={enableCamera} className={`mt-3 min-h-11 w-full bg-[#cf6d88] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c15c7a] ${BUILD_ONE_CLIP} ${BUILD_ONE_FOCUS}`}>{cameraEnabled ? "Webcam ready" : "Enable webcam"}</button>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded border border-[#143d50]/10 bg-[#143d50]/[0.035] p-1.5 pl-3">
              <p className="min-w-0 flex-1 truncate text-xs text-[#143d50]">{videoClipName ? `${videoClipName} selected` : "Choose a video clip"}</p>
              {videoClipName && <button type="button" onClick={clearVideoClip} className="min-h-11 shrink-0 rounded border border-[#cf6d88]/45 bg-white px-3 text-xs font-semibold text-[#a83e62] transition-colors hover:border-[#cf6d88] hover:bg-[#cf6d88] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf6d88]" aria-label="Clear uploaded video">Clear video</button>}
            </div>
          )}
          <p className="mt-2 text-[11px] leading-relaxed">{sourceMode === "video" ? "The clip loops while the model session is live." : "Your webcam streams only while a model session is live."}</p>
        </PanelSection>
      )}
      {references.length > 0 && (
        <PanelSection label={model.slug === "x2" ? "Reference image" : "Reference"}>
          <div className="flex gap-2 overflow-hidden">
            <label role="button" tabIndex={0} onKeyDown={(event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); event.currentTarget.querySelector("input")?.click(); } }} aria-label="Upload a reference image" className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center border border-dashed border-[#143d50]/35 text-2xl text-[#143d50]/55 transition-colors hover:border-[#cf6d88] hover:text-[#a83e62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf6d88]">
              +<input type="file" accept="image/*" onChange={handleReference} aria-label="Upload a reference image" className="sr-only" />
            </label>
            {referencePreview && <span className="h-14 w-14 shrink-0 overflow-hidden rounded border-2 border-[#cf6d88]"><img src={referencePreview} alt="Uploaded reference" className="h-full w-full object-cover" /></span>}
            {references.slice(0, 4).map((image) => (
              <button key={image} type="button" onClick={() => void selectBuiltInReference(image)} aria-label={`Use ${image} as the reference image`} aria-pressed={!referencePreview && selectedReferenceName === image} className={`h-14 w-14 shrink-0 overflow-hidden rounded border-2 transition-colors ${!referencePreview && selectedReferenceName === image ? "border-[#cf6d88]" : "border-transparent hover:border-[#cf6d88]/55"}`}>
                <img src={mediaUrl(`/models/${image}`)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <p aria-live="polite" className="mt-2 truncate text-[11px] text-[#5f6d72]">{selectedReferenceName} selected</p>
        </PanelSection>
      )}
      {model.family === "storyboard" && (
        <PanelSection label="Reference">
          {["Martian outpost", "Ratatouille service", "Wildlife montage"].map((title) => <button key={title} type="button" onClick={() => setPrompt(title === "Martian outpost" ? model.prompt : title)} className="mb-2 block w-full rounded-lg border border-[#143d50]/10 p-2 text-left text-sm font-semibold text-[#5f6d72] transition-colors hover:border-[#cf6d88]/45 hover:text-[#143d50]">{title}</button>)}
        </PanelSection>
      )}
      <PanelSection
        label={model.family === "camera" ? "Describe the edit" : model.family === "storyboard" ? "Opening shot" : model.family === "prompt" ? "Text prompt" : model.family === "happy" ? "Generate a world" : "Generate the scene"}
        action={<button type="button" onClick={openPromptHistory} className="rounded border border-[#143d50]/15 bg-white px-2 py-1 font-sans text-[11px] font-semibold normal-case tracking-normal text-[#a83e62] hover:border-[#cf6d88]" aria-label={`View prompt history, ${promptHistory.length} saved`}>View prompt history{promptHistory.length ? ` (${promptHistory.length})` : ""}</button>}
      >
        {model.presets && <div className="mb-2 flex flex-wrap gap-1.5">{model.presets.map((preset) => <button key={preset} type="button" onClick={() => setPrompt(preset)} className="rounded border border-[#143d50]/10 px-2 py-1 text-xs text-[#5f6d72] transition-colors hover:border-[#cf6d88]/45 hover:text-[#143d50]">{preset}</button>)}</div>}
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={model.family === "storyboard" ? 3 : 5} placeholder="Describe what you want to generate…" aria-label="Generation prompt" className="w-full resize-none rounded-lg border border-[#143d50]/10 bg-[#143d50]/[0.035] p-3 text-base leading-snug text-[#143d50] outline-none placeholder:text-[#5f6d72]/55 focus:border-[#cf6d88] focus:ring-2 focus:ring-[#cf6d88]/15" />
        <button type="button" onClick={isLive ? applyPrompt : startModel} disabled={!prompt.trim() || isBusy} className={`mt-3 min-h-11 w-full bg-[#cf6d88] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c15c7a] disabled:cursor-not-allowed disabled:opacity-45 ${isLive ? "" : "lg:hidden"} ${BUILD_ONE_CLIP} ${BUILD_ONE_FOCUS}`}>{primaryButtonLabel}</button>
        {model.family === "storyboard" && <p className="mt-2 text-[11px]">Each applied prompt adds a new scene to the timeline.</p>}
      </PanelSection>
      {error && <p role="alert" className="mx-4 mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} {!error.toLowerCase().includes("sign in") ? null : <> <Link href="/login" className="font-semibold underline underline-offset-2">Sign in</Link></>}</p>}
      {model.family === "storyboard" && scenes.length > 0 && <PanelSection label="Scenes"><p className="text-xs text-[#5f6d72]">{scenes.length} scene{scenes.length === 1 ? "" : "s"}</p></PanelSection>}
    </div>
  );
}

function PanelSection({ label, action, children }) {
  return <section className="border-b border-[#143d50]/10 p-4"><div className="mb-3 flex min-h-6 items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#143d50]"><span>{label}</span>{action}</div>{children}</section>;
}

function ModelSelector({ model }) {
  return <details className="group relative border-b border-[#143d50]/10"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 text-[#143d50]"><CubeIcon /><span className="min-w-0 flex-1"><strong className="font-display block text-base leading-tight">{model.name}</strong><span className="block truncate text-xs text-[#5f6d72]">{model.category}</span></span><span className="text-[#a83e62]">⌄</span></summary><div className="absolute left-2 right-2 top-[68px] z-50 grid rounded-xl border border-[#143d50]/10 bg-white p-1 shadow-[0_18px_45px_-24px_rgba(20,61,80,0.55)]">{Object.values(REACTOR_MODELS).map((item) => <Link key={item.slug} href={`/reactor/models/${item.slug}`} className={`rounded-lg px-3 py-2 text-sm text-[#5f6d72] transition-colors hover:bg-[#143d50]/[0.05] hover:text-[#143d50] ${item.slug === model.slug ? "font-semibold text-[#a83e62]" : ""}`}>{item.name}</Link>)}</div></details>;
}

function PlaybackBar({ status, isPaused, canStart, startModel, togglePause, stopModel }) {
  const isSessionLive = status === "live";
  const isConnecting = status === "connecting";
  const controlClass = "flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf6d88] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="flex min-h-16 flex-wrap items-center gap-3 border-t border-[#143d50]/10 px-4 py-2 text-[#143d50] sm:px-5">
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${isSessionLive ? "bg-emerald-500" : status === "connecting" ? "animate-pulse bg-amber-500" : "bg-[#cf6d88]"}`} />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em]">{status === "connecting" ? "Connecting" : isSessionLive ? (isPaused ? "Paused" : "Live") : "Ready"}</span>
      </span>
      <div className="grid w-full grid-cols-3 gap-2 sm:ml-auto sm:w-auto lg:grid-cols-none lg:grid-flow-col">
        <button type="button" onClick={startModel} disabled={status !== "ready" || !canStart} className={`${controlClass} hidden border-[#cf6d88] bg-[#cf6d88] text-white hover:bg-[#c15c7a] lg:flex`} aria-label="Start session">Start</button>
        <button type="button" onClick={togglePause} disabled={!isSessionLive || isPaused} className={`${controlClass} border-[#143d50]/15 bg-white text-[#143d50] hover:border-[#143d50]/35 hover:bg-[#143d50]/[0.045]`} aria-label="Pause session">Pause</button>
        <button type="button" onClick={togglePause} disabled={!isSessionLive || !isPaused} className={`${controlClass} border-[#143d50]/15 bg-white text-[#143d50] hover:border-[#143d50]/35 hover:bg-[#143d50]/[0.045]`} aria-label="Resume session">Resume</button>
        <button type="button" onClick={stopModel} disabled={!isSessionLive && !isConnecting} className={`${controlClass} border-[#cf6d88]/45 bg-[#cf6d88]/10 text-[#a83e62] hover:border-[#cf6d88] hover:bg-[#cf6d88] hover:text-white`} aria-label="Disconnect session">Disconnect</button>
      </div>
    </div>
  );
}

function formatPromptHistoryTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved prompt";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatPromptHistoryIso(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function WorldControls({ model, isLive, rotationSpeed, setRotationSpeed, sendWorldControl }) {
  const control = (type, value, label) => <button type="button" disabled={!isLive} onPointerDown={() => sendWorldControl(type, value, true)} onPointerUp={() => sendWorldControl(type, value, false)} onPointerLeave={() => sendWorldControl(type, value, false)} onPointerCancel={() => sendWorldControl(type, value, false)} className="flex h-11 min-w-11 items-center justify-center rounded-lg border border-[#143d50]/10 bg-white text-sm font-medium text-[#5f6d72] transition-colors hover:border-[#cf6d88]/50 hover:bg-[#cf6d88] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#143d50]/10 disabled:hover:bg-white disabled:hover:text-[#5f6d72]">{label}</button>;
  return <div className="grid gap-6 border-t border-[#143d50]/10 px-6 py-5 sm:grid-cols-[210px_180px_minmax(220px,1fr)]"><div><p className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#143d50]/65">Move</p><div className="grid w-fit grid-cols-3 gap-1"><span />{control("move", model.slug === "happy-oyster" ? "Front" : "forward", "W")}<span />{control("move", model.slug === "happy-oyster" ? "Left" : "strafe_left", "A")}{control("move", model.slug === "happy-oyster" ? "Back" : "back", "S")}{control("move", model.slug === "happy-oyster" ? "Right" : "strafe_right", "D")}</div></div><div><p className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#143d50]/65">Look</p><div className="grid w-fit grid-cols-3 gap-1"><span />{control("look", "up", "↑")}<span />{control("look", "left", "←")}{control("look", "down", "↓")}{control("look", "right", "→")}</div></div>{model.slug !== "happy-oyster" && <label className="pt-1"><span className="flex justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-[#143d50]/65"><span>Rotation speed</span><span>{rotationSpeed}°/frame</span></span><input type="range" min="0" max="30" value={rotationSpeed} onChange={(event) => setRotationSpeed(event.target.value)} className="mt-4 w-full accent-[#cf6d88]" /></label>}</div>;
}

function Timeline({ scenes, setPrompt }) {
  return <div className="border-t border-[#143d50]/10 p-4"><div className="flex flex-wrap justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#143d50]/65"><span>Timeline · {scenes.length} scenes</span><span>Select a scene to reuse its prompt</span></div><div className="mt-3 flex min-h-28 overflow-x-auto rounded-lg border border-[#143d50]/10 bg-[#143d50]/[0.035]">{scenes.length === 0 ? <p className="m-auto text-xs">Add an opening shot to begin your storyboard.</p> : scenes.map((scene, index) => <button type="button" onClick={() => setPrompt(scene.prompt)} key={`${scene.prompt}-${index}`} className="m-2 min-w-40 border-l-4 border-[#cf6d88] bg-white p-3 text-left text-xs text-[#143d50] transition-colors hover:bg-[#cf6d88]/10"><strong>Scene {index + 1}</strong><p className="mt-1 line-clamp-2 text-[#5f6d72]">{scene.prompt}</p></button>)}</div></div>;
}

function ReactorFooter() {
  return <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#143d50]/10 px-5 py-7 font-mono text-[10px] uppercase tracking-[0.08em] text-[#143d50]/65 sm:px-12"><span>© 2026 launchd</span><span>Powered by Reactor · World Models Build 1</span></footer>;
}

function ReactorGlyph({ className = "" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className} aria-hidden><path d="M3 5h18v7H3zM7 12v5m10-5v5M4 17h5m6 0h5M12 12v7" /></svg>;
}

function CubeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" /></svg>;
}

function subscribeModelMessages(activeModel, handler) {
  if (activeModel.onMessage) return activeModel.onMessage(handler);
  const wrappedHandler = (message) => handler(message?.data || message);
  activeModel.on?.("message", wrappedHandler);
  return () => activeModel.off?.("message", wrappedHandler);
}

function waitForModelMessage(activeModel, predicate, timeoutMs = 20_000, timeoutMessage = "Reactor did not confirm the reference image in time.") {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error(timeoutMessage));
    }, timeoutMs);
    unsubscribe = subscribeModelMessages(activeModel, (message) => {
      if (message?.type === "command_error") {
        window.clearTimeout(timeout);
        unsubscribe();
        reject(new Error(message.reason || "Reactor rejected the reference image."));
        return;
      }
      if (!predicate(message)) return;
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(message);
    });
  });
}

function waitForSessionLive(statusRef, startupErrorRef, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (statusRef.current === "live") {
        resolve();
        return;
      }
      if (startupErrorRef.current) {
        reject(new Error(startupErrorRef.current));
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("Reactor took too long to start generating. Please disconnect and try again."));
        return;
      }
      window.setTimeout(check, 100);
    };
    check();
  });
}

function waitForReady(activeModel, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("The model took too long to become ready.")), timeoutMs);
    const handler = (nextStatus) => {
      if (nextStatus !== "ready") return;
      window.clearTimeout(timeout);
      activeModel.off?.("statusChanged", handler);
      resolve();
    };
    activeModel.on?.("statusChanged", handler);
  });
}
