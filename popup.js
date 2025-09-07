document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject content script if not loaded
  chrome.scripting.executeScript(
    { target: { tabId: tab.id }, files: ['content.js'] },
    () => fetchSkills(tab.id)
  );

  // Search filter
  document.getElementById("skill-search").addEventListener("input", () => {
    const filter = document.getElementById("skill-search").value.toLowerCase();
    const rows = document.querySelectorAll("#skills tr");
    rows.forEach(row => {
      const checkbox = row.querySelector(".skill-select");
      if (!checkbox) return;
      const skillName = checkbox.dataset.name.toLowerCase();
      row.style.display = skillName.includes(filter) ? "" : "none";
    });
  });

  // Calculate button
  document.getElementById("calculate").addEventListener("click", () => {
    const totalPoints = parseInt(document.getElementById("points").value, 10);
    const skills = [];

    document.querySelectorAll(".skill-select").forEach(checkbox => {
      if (checkbox.checked) {
        const name = checkbox.dataset.name;
        const costInput = document.querySelector(`.skill-cost[data-name="${name}"]`);
        const cost = parseFloat(costInput.value);
        const gain = parseFloat(checkbox.closest("tr").querySelector("td:nth-child(2)").innerText);
        const unstable = !!checkbox.closest("tr").querySelector(".tooltip");

        if (!isNaN(cost)) skills.push({ name, gain, cost, unstable });
      }
    });

    const result = calculateBestCombo(totalPoints, skills);
    document.getElementById("output").textContent = result.join("\n");
  });
});

// Fetch skills from content script
function fetchSkills(tabId) {
  chrome.tabs.sendMessage(tabId, { action: "getSkills" }, (skills) => {
    if (!skills || skills.length === 0) {
      console.warn("No skills received from content script.");
      return;
    }

    const skillsTbody = document.getElementById("skills");
    skillsTbody.innerHTML = "";

    skills.forEach(skill => {
      const row = document.createElement("tr");

      const warning = skill.unstable
        ? `<span class="tooltip">&#9888;
             <span class="tooltiptext">Best gain minus worst gain >= 5.0, may be unstable</span>
           </span>`
        : "";

      row.innerHTML = `
        <td><input type="checkbox" class="skill-select" data-name="${skill.name}"> ${skill.name}</td>
        <td>${skill.gain.toFixed(2)} L</td>
        <td><input type="number" class="skill-cost" data-name="${skill.name}"></td>
        <td>${warning}</td>
      `;

      const checkbox = row.querySelector(".skill-select");
      checkbox.addEventListener("change", () => {
        row.classList.toggle("selected", checkbox.checked);
      });

      skillsTbody.appendChild(row);
    });

    adjustPopupWidth();
  });
}

// Auto-adjust popup width
function adjustPopupWidth() {
  const table = document.querySelector("#skills-container table");
  if (!table) return;

  let maxSkillLength = 0;
  document.querySelectorAll(".skill-select").forEach(checkbox => {
    const len = checkbox.dataset.name.length;
    if (len > maxSkillLength) maxSkillLength = len;
  });

  const width = Math.min(800, 200 + maxSkillLength * 10);
  document.body.style.width = width + "px";
}
