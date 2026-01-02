// Fetch scoreboard data
fetch("/api/scoreboard")
  .then(res => res.json())
  .then(data => {
    // Sort by score descending
    data.sort((a, b) => (b.Score || 0) - (a.Score || 0));

    // Take top 10
    const top10 = data.slice(0, 10);

    // Get table
    const table = document.getElementById("scores");

    // Clear any existing rows
    table.innerHTML = "<tr><th>Name</th><th>Score</th></tr>";

    // Add rows for top 10
    top10.forEach(user => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${user.Name}</td><td>${user.Score || 0}</td>`;
      table.appendChild(row);
    });

    // Redirect to index after 10 seconds
    setTimeout(() => {
      window.location.href = "/";
    }, 10000); // 10000 ms = 10 seconds
  })
  .catch(err => console.error("Error fetching scoreboard:", err));
