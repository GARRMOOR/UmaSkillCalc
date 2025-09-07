/**
 * Calculate the best skill combo given total points and a list of skills.
 *
 * @param {number} totalPoints - The points available to spend
 * @param {Array} skills - An array of skills, each with {name, gain, cost}
 * @returns {Array} - A list of skill names to purchase
 */
function calculateBestCombo(totalPoints, skills) {
  // Step 1: Add efficiency (gain per cost) to each skill
  skills.forEach(skill => {
    skill.efficiency = skill.gain / skill.cost;
  });

  // Step 2: Sort by efficiency (highest first)
  skills.sort((a, b) => b.efficiency - a.efficiency);

  // Step 3: Pick skills while we have enough points
  const chosen = [];
  let remaining = totalPoints;

  for (const skill of skills) {
    if (skill.cost <= remaining) {
      chosen.push(skill.name);
      remaining -= skill.cost;
    }
  }

  return chosen;
}