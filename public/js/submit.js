const requestForm = document.getElementById("requestForm");
const formMessage = document.getElementById("formMessage");

requestForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(requestForm);
  const requestBody = {
    youtube_url: formData.get("youtube_url"),
    requester_email: formData.get("requester_email"),
  };

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
      formMessage.textContent = data.message;
      formMessage.className = "message success";
      requestForm.reset();
    })
    .catch(() => {
      formMessage.textContent = "Please enter a valid request and try again.";
      formMessage.className = "message error";
    });
});
