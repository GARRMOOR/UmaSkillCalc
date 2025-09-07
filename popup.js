// popup.js - updated to await fetchSkills and restore AFTER table is populated

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject content script (if needed) then fetch skills and restore saved state
  chrome.scripting.executeScript(
    { target: { tabId: tab.id }, files: ['content.js'] },
    async () => {
      await fetchSkills(tab.id);
      restoreData(); // restore after table rows are available
    }
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
        const gainText = checkbox.closest("tr").querySelector("td:nth-child(2)").innerText;
        const gain = parseFloat(gainText);
        const unstable = !!checkbox.closest("tr").querySelector(".tooltip");

        if (!isNaN(cost)) skills.push({ name, gain, cost, unstable });
      }
    });

    const result = calculateBestCombo(totalPoints, skills);
    document.getElementById("output").textContent = result.join("\n");

    // Save current state
    saveData();
  });

  // Reset button
  document.getElementById("reset").addEventListener("click", () => {
    chrome.storage.local.clear(() => {
      console.log("Storage cleared");
      document.getElementById("points").value = "";
      document.getElementById("skill-search").value = "";
      document.getElementById("output").textContent = "";
      document.querySelectorAll(".skill-select").forEach(cb => cb.checked = false);
      document.querySelectorAll(".skill-cost").forEach(input => input.value = "");
      document.querySelectorAll("tr").forEach(row => row.classList.remove("selected"));
    });
  });
});

// Save state
function saveData() {
  const data = {
    points: document.getElementById("points").value,
    skills: []
  };

  document.querySelectorAll(".skill-select").forEach(checkbox => {
    const name = checkbox.dataset.name;
    const costInput = document.querySelector(`.skill-cost[data-name="${name}"]`);
    data.skills.push({
      name,
      checked: checkbox.checked,
      cost: costInput ? costInput.value : ""
    });
  });

  chrome.storage.local.set({ umaData: data }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving data:", chrome.runtime.lastError);
    } else {
      console.log("Saved umaData:", data);
    }
  });
}

// Restore state
function restoreData() {
  chrome.storage.local.get("umaData", (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error reading storage:", chrome.runtime.lastError);
      return;
    }
    if (!result.umaData) {
      console.log("No saved umaData found.");
      return;
    }
    const data = result.umaData;
    console.log("Restoring umaData:", data);

    document.getElementById("points").value = data.points || "";

    // If the table rows aren't populated yet, wait briefly (defensive)
    const interval = setInterval(() => {
      const rows = document.querySelectorAll(".skill-select");
      if (rows.length === 0) return;
      clearInterval(interval);

      data.skills.forEach(savedSkill => {
        const checkbox = document.querySelector(`.skill-select[data-name="${savedSkill.name}"]`);
        const costInput = document.querySelector(`.skill-cost[data-name="${savedSkill.name}"]`);
        if (checkbox) {
          checkbox.checked = savedSkill.checked;
          checkbox.closest("tr").classList.toggle("selected", savedSkill.checked);
        }
        if (costInput) costInput.value = savedSkill.cost;
      });

      console.log("Restore complete.");
    }, 150);
  });
}

// Fetch skills from content script — returns a Promise that resolves after rows are populated
function fetchSkills(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: "getSkills" }, (skills) => {
      if (chrome.runtime.lastError) {
        console.error("sendMessage error:", chrome.runtime.lastError.message);
        resolve();
        return;
      }

      if (!skills || skills.length === 0) {
        console.warn("No skills received from content script.");
        resolve();
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
          saveData(); // auto-save on change
        });

        const costInput = row.querySelector(".skill-cost");
        costInput.addEventListener("input", () => saveData()); // auto-save on input

        skillsTbody.appendChild(row);
      });

      console.log(`Fetched and populated ${skills.length} skills.`);
      adjustPopupWidth();
      resolve();
    });
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

  const width = Math.min(900, 220 + maxSkillLength * 10);
  document.body.style.width = width + "px";
}
