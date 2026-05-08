const youtubeSearchForm = document.getElementById("youtubeSearchForm");
const searchTopic = document.getElementById("searchTopic");
const searchLanguage = document.getElementById("searchLanguage");
const searchMessage = document.getElementById("searchMessage");
const searchResults = document.getElementById("searchResults");
const selectedVideoPanel = document.getElementById("selectedVideoPanel");
const manualRequestForm = document.getElementById("manualRequestForm");
const manualFormMessage = document.getElementById("manualFormMessage");

let selectedVideo = null;

function setMessage(element, text, type) {
  element.textContent = text;
  element.className = type ? `message ${type}` : "message";
}

function getYouTubeEmbedUrl(youtubeUrl) {
  try {
    const url = new URL(youtubeUrl);
    const videoId = url.searchParams.get("v");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
  } catch {
    return "";
  }
}

function shortenDescription(description) {
  if (!description) {
    return "No description available.";
  }

  return description.length > 170 ? `${description.slice(0, 170)}...` : description;
}

function createResultCard(video) {
  const card = document.createElement("article");
  card.className = "card search-result-card";

  if (video.thumbnail) {
    const image = document.createElement("img");
    image.src = video.thumbnail;
    image.alt = "";
    image.loading = "lazy";
    card.appendChild(image);
  }

  const content = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = video.title;
  content.appendChild(title);

  const meta = document.createElement("p");
  meta.className = "note";
  meta.textContent = `${video.channelTitle} | ${video.duration}`;
  content.appendChild(meta);

  const description = document.createElement("p");
  description.textContent = shortenDescription(video.description);
  content.appendChild(description);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Select Video";
  button.addEventListener("click", () => selectVideo(video));
  content.appendChild(button);

  card.appendChild(content);
  return card;
}

function renderSearchResults(videos) {
  searchResults.innerHTML = "";

  if (videos.length === 0) {
    setMessage(searchMessage, "No matching 10-15 minute tutorial videos were found. You can still paste a YouTube URL manually.", "error");
    return;
  }

  setMessage(searchMessage, `${videos.length} filtered result${videos.length === 1 ? "" : "s"} found.`, "success");
  videos.forEach((video) => searchResults.appendChild(createResultCard(video)));
}

function selectVideo(video) {
  selectedVideo = video;
  selectedVideoPanel.innerHTML = "";

  const panel = document.createElement("article");
  panel.className = "selected-video-card";

  const heading = document.createElement("div");
  heading.className = "section-heading";
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Selected video";
  const title = document.createElement("h2");
  title.textContent = video.title;
  heading.appendChild(eyebrow);
  heading.appendChild(title);
  panel.appendChild(heading);

  const meta = document.createElement("p");
  meta.className = "note";
  meta.textContent = `${video.channelTitle} | ${video.duration}`;
  panel.appendChild(meta);

  const embedUrl = getYouTubeEmbedUrl(video.youtube_url);
  if (embedUrl) {
    const iframe = document.createElement("iframe");
    iframe.className = "youtube-player";
    iframe.src = embedUrl;
    iframe.title = video.title;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    panel.appendChild(iframe);
  }

  const actions = document.createElement("div");
  actions.className = "actions";

  const youtubeLink = document.createElement("a");
  youtubeLink.className = "button secondary";
  youtubeLink.href = video.youtube_url;
  youtubeLink.target = "_blank";
  youtubeLink.rel = "noopener noreferrer";
  youtubeLink.textContent = "Open on YouTube";
  actions.appendChild(youtubeLink);

  const submitButton = document.createElement("button");
  submitButton.type = "button";
  submitButton.textContent = "Submit Selected Video for Offline Review";
  submitButton.addEventListener("click", submitSelectedVideo);
  actions.appendChild(submitButton);

  panel.appendChild(actions);

  const emailGroup = document.createElement("div");
  emailGroup.className = "selected-email-group";
  const label = document.createElement("label");
  label.setAttribute("for", "selectedRequesterEmail");
  label.textContent = "Email optional";
  const input = document.createElement("input");
  input.id = "selectedRequesterEmail";
  input.type = "email";
  input.placeholder = "name@example.com";
  emailGroup.appendChild(label);
  emailGroup.appendChild(input);
  panel.appendChild(emailGroup);

  const message = document.createElement("p");
  message.id = "selectedFormMessage";
  message.className = "message";
  message.setAttribute("aria-live", "polite");
  panel.appendChild(message);

  selectedVideoPanel.appendChild(panel);
  selectedVideoPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function submitRequest(requestBody, messageElement, formToReset) {
  fetch("/api/requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Request failed.");
      }

      return response.json();
    })
    .then((data) => {
      setMessage(messageElement, data.message, "success");
      if (formToReset) {
        formToReset.reset();
      }
    })
    .catch(() => {
      setMessage(messageElement, "Please enter a valid YouTube request and try again.", "error");
    });
}

function submitSelectedVideo() {
  const messageElement = document.getElementById("selectedFormMessage");
  const emailInput = document.getElementById("selectedRequesterEmail");

  if (!selectedVideo) {
    setMessage(messageElement, "Select a video before submitting.", "error");
    return;
  }

  submitRequest(
    {
      youtube_url: selectedVideo.youtube_url,
      requester_email: emailInput ? emailInput.value.trim() : "",
      video_title: selectedVideo.title,
      channel_title: selectedVideo.channelTitle,
      duration: selectedVideo.duration,
    },
    messageElement
  );
}

youtubeSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const query = searchTopic.value.trim();
  const language = searchLanguage.value;

  searchResults.innerHTML = "";
  selectedVideoPanel.innerHTML = "";
  selectedVideo = null;

  if (!query) {
    setMessage(searchMessage, "Enter a search topic before searching.", "error");
    return;
  }

  setMessage(searchMessage, "Searching YouTube...", "");

  const params = new URLSearchParams({ q: query });
  if (language) {
    params.set("language", language);
  }

  fetch(`/api/youtube/search?${params}`)
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.error || "YouTube search failed.");
        });
      }

      return response.json();
    })
    .then(renderSearchResults)
    .catch((error) => {
      setMessage(
        searchMessage,
        error.message || "YouTube search is currently unavailable. You can still paste a YouTube URL manually.",
        "error"
      );
    });
});

manualRequestForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(manualRequestForm);
  const youtubeUrl = String(formData.get("youtube_url") || "").trim();

  if (!youtubeUrl) {
    setMessage(manualFormMessage, "Enter a YouTube URL before submitting.", "error");
    return;
  }

  submitRequest(
    {
      youtube_url: youtubeUrl,
      requester_email: formData.get("requester_email"),
    },
    manualFormMessage,
    manualRequestForm
  );
});
