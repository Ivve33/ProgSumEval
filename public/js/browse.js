const searchInput = document.getElementById("searchInput");
const videoCards = document.getElementById("videoCards");

function createCard(video) {
  const card = document.createElement("article");
  card.className = "card";

  const title = document.createElement("h2");
  title.textContent = video.title;
  card.appendChild(title);

  const details = document.createElement("p");
  details.textContent = [
    `Language: ${video.language || "Not specified"}`,
    `Topic: ${video.topic || "Not specified"}`,
    `Duration: ${video.duration || "Not specified"}`,
    `Difficulty: ${video.difficulty || "Not specified"}`,
  ].join(" | ");
  card.appendChild(details);

  const link = document.createElement("a");
  link.href = `/video/${video.id}`;
  link.textContent = "View details";
  link.className = "button";
  card.appendChild(link);

  return card;
}

function renderVideos(videos) {
  videoCards.innerHTML = "";

  if (videos.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "No benchmark videos available yet.";
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
