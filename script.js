const state = {
  audioFile: null,
  audioUrl: "",
  image: null,
  imageName: "",
  videoBlob: null,
  renderUrl: "",
};

const canvas = document.querySelector("#preview");
const ctx = canvas.getContext("2d");
const audioInput = document.querySelector("#audioInput");
const imageInput = document.querySelector("#imageInput");
const audioDrop = document.querySelector("#audioDrop");
const imageDrop = document.querySelector("#imageDrop");
const audioName = document.querySelector("#audioName");
const imageUrl = document.querySelector("#imageUrl");
const fetchImage = document.querySelector("#fetchImage");
const imageStatus = document.querySelector("#imageStatus");
const pinterestQuery = document.querySelector("#pinterestQuery");
const pinterestForm = document.querySelector("#pinterestForm");
const pinterestSearch = document.querySelector("#pinterestSearch");
const openPinterestHome = document.querySelector("#openPinterestHome");
const pastePinterest = document.querySelector("#pastePinterest");
const formatSelect = document.querySelector("#formatSelect");
const titleText = document.querySelector("#titleText");
const renderButton = document.querySelector("#renderButton");
const downloadLink = document.querySelector("#downloadLink");
const notice = document.querySelector("#notice");
const progressShell = document.querySelector(".progressShell");
const progressBar = document.querySelector("#progressBar");

const formats = {
  story: [1080, 1920],
  square: [1080, 1080],
  landscape: [1920, 1080],
};

function setNotice(message) {
  notice.textContent = message;
}

function setBusy(isBusy) {
  renderButton.disabled = isBusy || !state.audioFile || !state.image;
  fetchImage.disabled = isBusy;
  pinterestSearch.disabled = isBusy;
  openPinterestHome.disabled = isBusy;
  pastePinterest.disabled = isBusy;
}

function preferredMime() {
  const choices = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return choices.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function fileBaseName(name) {
  return (name || "beat-video")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "beat-video";
}

function setFormat() {
  const [width, height] = formats[formatSelect.value];
  canvas.width = width;
  canvas.height = height;
  canvas.style.aspectRatio = `${width} / ${height}`;
  drawPreview(0);
}

function coverRect(imgW, imgH, outW, outH, scaleBoost = 1) {
  const scale = Math.max(outW / imgW, outH / imgH) * scaleBoost;
  const width = imgW * scale;
  const height = imgH * scale;
  return {
    x: (outW - width) / 2,
    y: (outH - height) / 2,
    width,
    height,
  };
}

function drawRoundedPanel(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPreview(progress = 0) {
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  if (!state.image) {
    ctx.fillStyle = "#0d0f12";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#f4f0e8";
    ctx.font = `700 ${Math.round(width * 0.055)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Lisää kuva", width / 2, height / 2 - 18);
    ctx.fillStyle = "#a9acb5";
    ctx.font = `500 ${Math.round(width * 0.028)}px system-ui`;
    ctx.fillText("Tiputa kuva tähän tai hae Pinterest-linkillä", width / 2, height / 2 + 34);
    return;
  }

  const motion = 1;
  const bgRect = coverRect(state.image.width, state.image.height, width, height, 1.12);

  ctx.save();
  ctx.filter = "blur(42px) saturate(1.25) brightness(0.68)";
  ctx.drawImage(state.image, bgRect.x, bgRect.y, bgRect.width, bgRect.height);
  ctx.restore();

  ctx.fillStyle = "rgba(8, 9, 12, 0.24)";
  ctx.fillRect(0, 0, width, height);

  const mainRect = coverRect(state.image.width, state.image.height, width, height, motion);
  ctx.drawImage(state.image, mainRect.x, mainRect.y, mainRect.width, mainRect.height);

  const vignette = ctx.createLinearGradient(0, height * 0.58, 0, height);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.68)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  const barWidth = width * 0.62;
  const barHeight = Math.max(8, height * 0.006);
  const barX = (width - barWidth) / 2;
  const barY = height - height * 0.07;
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  drawRoundedPanel(barX, barY, barWidth, barHeight, barHeight / 2);
  ctx.fill();
  ctx.fillStyle = "#f3c96b";
  drawRoundedPanel(barX, barY, Math.max(barHeight, barWidth * progress), barHeight, barHeight / 2);
  ctx.fill();

  const text = titleText.value.trim();
  if (text) {
    const fontSize = Math.max(34, Math.round(width * 0.058));
    ctx.textAlign = "center";
    ctx.font = `800 ${fontSize}px system-ui`;
    ctx.fillStyle = "#f4f0e8";
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 18;
    ctx.fillText(text, width / 2, height - height * 0.105);
    ctx.shadowBlur = 0;
  }
}

function updateReadyState() {
  setBusy(false);
  if (state.audioFile && state.image) {
    setNotice("Valmis. Tee video, kun biitti ja kuva näyttävät oikeilta.");
  }
}

async function loadImageFromBlob(blob, name = "kuva") {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  state.image = img;
  state.imageName = name;
  imageStatus.textContent = `Kuva valittu: ${name}`;
  drawPreview(0);
  updateReadyState();
}

function loadAudio(file) {
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioFile = file;
  state.audioUrl = URL.createObjectURL(file);
  audioName.textContent = file.name;
  updateReadyState();
}

function wireDrop(target, callback) {
  target.addEventListener("dragover", (event) => {
    event.preventDefault();
    target.classList.add("dragOver");
  });

  target.addEventListener("dragleave", () => {
    target.classList.remove("dragOver");
  });

  target.addEventListener("drop", (event) => {
    event.preventDefault();
    target.classList.remove("dragOver");
    const file = event.dataTransfer.files?.[0];
    if (file) callback(file);
  });
}

audioInput.addEventListener("change", () => {
  const file = audioInput.files?.[0];
  if (file) loadAudio(file);
});

imageInput.addEventListener("change", async () => {
  const file = imageInput.files?.[0];
  if (file) await loadImageFromBlob(file, file.name);
});

wireDrop(audioDrop, (file) => {
  if (file.type.startsWith("audio/")) loadAudio(file);
});

wireDrop(imageDrop, async (file) => {
  if (file.type.startsWith("image/")) await loadImageFromBlob(file, file.name);
});

async function fetchImageFromInput() {
  const url = imageUrl.value.trim();
  if (!url) {
    imageStatus.textContent = "Liitä ensin Pinterest- tai kuvalinkki.";
    return;
  }

  try {
    setBusy(true);
    imageStatus.textContent = "Haen kuvaa...";
    const response = await fetch(`/api/image?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Kuvan haku epäonnistui.");
    }

    const blob = await response.blob();
    await loadImageFromBlob(blob, "Pinterest-kuva");
  } catch (error) {
    imageStatus.textContent = error.message;
  } finally {
    setBusy(false);
  }
}

function openPinterest(url) {
  const win = window.open(url, "pinterest-picker", "noopener,noreferrer");
  if (!win) {
    imageStatus.textContent = "Selain esti uuden ikkunan. Salli ponnahdusikkuna tai avaa Pinterest-nappi uudestaan.";
  }
}

fetchImage.addEventListener("click", fetchImageFromInput);

pinterestForm.addEventListener("submit", () => {
  if (!pinterestQuery.value.trim()) {
    pinterestForm.action = "https://www.pinterest.com/";
  } else {
    pinterestForm.action = "https://www.pinterest.com/search/pins/";
  }
});

openPinterestHome.addEventListener("click", () => {
  openPinterest("https://www.pinterest.com/");
});

pastePinterest.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      imageStatus.textContent = "Leikepöydällä ei ole linkkiä.";
      return;
    }

    imageUrl.value = text.trim();
    await fetchImageFromInput();
  } catch {
    imageStatus.textContent = "Leikepöydän luku estyi. Liitä linkki käsin linkkikenttään.";
  }
});

[formatSelect, titleText].forEach((control) => {
  control.addEventListener("input", () => drawPreview(0));
});

async function decodeAudioDuration(url) {
  const audio = new Audio();
  audio.preload = "metadata";
  audio.src = url;
  await new Promise((resolve, reject) => {
    audio.onloadedmetadata = resolve;
    audio.onerror = () => reject(new Error("Äänitiedostoa ei voitu lukea."));
  });
  return audio.duration;
}

async function renderVideo() {
  if (!state.audioFile || !state.image) return;

  const mimeType = preferredMime();
  if (!mimeType) {
    setNotice("Tämä selain ei tue videoiden tallennusta MediaRecorderilla.");
    return;
  }

  if (state.renderUrl) URL.revokeObjectURL(state.renderUrl);
  downloadLink.hidden = true;
  progressShell.hidden = false;
  progressBar.style.width = "0%";
  setBusy(true);

  const extension = mimeType.includes("mp4") ? "mp4" : "webm";
  setNotice(extension === "mp4" ? "Renderöin MP4-videota..." : "Selain ei tue MP4-tallennusta, renderöin WebM-videon.");

  const audio = new Audio(state.audioUrl);
  audio.crossOrigin = "anonymous";
  audio.preload = "auto";

  const audioContext = new AudioContext();
  const source = audioContext.createMediaElementSource(audio);
  const destination = audioContext.createMediaStreamDestination();
  source.connect(destination);
  source.connect(audioContext.destination);

  const fps = 30;
  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);

  const chunks = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 7_500_000,
    audioBitsPerSecond: 192_000,
  });

  const duration = await decodeAudioDuration(state.audioUrl);
  let startTime = 0;
  let frameId = 0;

  function frame(time) {
    if (!startTime) startTime = time;
    const elapsed = (time - startTime) / 1000;
    const progress = Math.min(elapsed / duration, 1);
    progressBar.style.width = `${Math.round(progress * 100)}%`;
    drawPreview(progress);
    if (progress < 1 && !audio.ended) {
      frameId = requestAnimationFrame(frame);
    }
  }

  await new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("Videon tallennus keskeytyi."));
    recorder.onstop = resolve;
    audio.onerror = () => reject(new Error("Äänen toisto epäonnistui renderöinnissä."));
    audio.onended = () => {
      cancelAnimationFrame(frameId);
      drawPreview(1);
      recorder.stop();
      combinedStream.getTracks().forEach((track) => track.stop());
    };

    recorder.start(1000);
    audioContext.resume().then(() => {
      frameId = requestAnimationFrame(frame);
      audio.play().catch(reject);
    });
  });

  await audioContext.close();

  state.videoBlob = new Blob(chunks, { type: mimeType });
  state.renderUrl = URL.createObjectURL(state.videoBlob);

  const base = fileBaseName(titleText.value || state.audioFile.name);
  downloadLink.href = state.renderUrl;
  downloadLink.download = `${base}.${extension}`;
  downloadLink.textContent = `Lataa ${extension.toUpperCase()}`;
  downloadLink.hidden = false;
  progressBar.style.width = "100%";
  setNotice(extension === "mp4" ? "Valmis MP4 ladattavaksi." : "Valmis WebM ladattavaksi. Chrome/Edge voi myöhemmin tukea MP4:tä suoraan tällä koneella.");
  setBusy(false);
}

renderButton.addEventListener("click", () => {
  renderVideo().catch((error) => {
    console.error(error);
    setNotice(error.message);
    setBusy(false);
  });
});

setFormat();
setBusy(false);
