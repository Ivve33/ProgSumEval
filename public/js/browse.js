const searchInput = document.getElementById("searchInput");
const videoCards = document.getElementById("videoCards");

let hasLoadedAnyVideos = false;

function addText(parent, tagName, text, className) {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) {
    element.className = className;
  }
  parent.appendChild(element);
  return element;
}

function createMetaList(video) {
  const list = document.createElement("dl");
  list.className = "meta-list";

  const fields = [
    ["Code", video.video_code],
    ["Channel", video.channel],
    ["Language", video.language],
    ["Topic", video.topic],
  ];

  if (video.duration) {
    fields.push(["Duration", video.duration]);
  }

  if (video.difficulty) {
    fields.push(["Difficulty", video.difficulty]);
  }

  fields.forEach(([label, value]) => {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value || "Not specified";
    list.appendChild(term);
    list.appendChild(description);
  });

  return list;
}

function createCard(video) {
  const card = document.createElement("article");
  card.className = "card tutorial-card";

  addText(card, "p", video.video_code, "code-label");
  addText(card, "h2", video.title);
  card.appendChild(createMetaList(video));

  const link = document.createElement("a");
  link.href = `/video/${video.id}`;
  link.textContent = "Open Details";
  link.className = "button";
  card.appendChild(link);

  return card;
}

function renderVideos(videos) {
  videoCards.innerHTML = "";

  if (videos.length > 0) {
    hasLoadedAnyVideos = true;
  }

  if (videos.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = searchInput.value.trim() && hasLoadedAnyVideos
      ? "No matching videos found."
      : "No benchmark videos available yet.";
    videoCards.appendChild(emptyMessage);
    return;
  }

  videos.forEach((video) => {
    videoCards.appendChild(createCard(video));
  });
}

function loadVideos() {
  const search = searchInput.value.trim();
  const url = search ? `/api/videos?search=${encodeURIComponent(search)}` : "/api/videos";

  fetch(url)
    .then((response) => response.json())
    .then(renderVideos)
    .catch(() => {
      videoCards.innerHTML = "";
      const errorMessage = document.createElement("p");
      errorMessage.className = "empty-message";
      errorMessage.textContent = "Could not load benchmark videos.";
      videoCards.appendChild(errorMessage);
    });
}

searchInput.addEventListener("input", loadVideos);
loadVideos();
