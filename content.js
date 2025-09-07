function getSkillsFromPage() {
  const rows = document.querySelectorAll("tr[data-skillid]");
  const skills = [];

  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 5) {
      const name = cells[0].innerText.trim();
      const worst = parseFloat(cells[1].innerText.replace(" L", "").trim());
      const best = parseFloat(cells[2].innerText.replace(" L", "").trim());
      const mean = parseFloat(cells[3].innerText.replace(" L", "").trim());

      let unstable = false;
      if (!isNaN(worst) && !isNaN(best) && (best - worst >= 5.0)) unstable = true;
      if (!isNaN(mean)) skills.push({ name, gain: mean, unstable });
    }
  });

  return skills;
}

function waitForTable(callback, interval = 200, timeout = 5000) {
  const start = Date.now();
  const check = () => {
    const rows = document.querySelectorAll("tr[data-skillid]");
    if (rows.length > 0) callback();
    else if (Date.now() - start < timeout) setTimeout(check, interval);
    else callback();
  };
  check();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getSkills") {
    waitForTable(() => {
      const skills = getSkillsFromPage();
      sendResponse(skills);
    });
    return true; // async response
  }
});

console.log("Content script loaded and listening.");
