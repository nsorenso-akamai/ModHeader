document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('header-list');
  const addBtn = document.getElementById('add-row');
  const saveBtn = document.getElementById('save');

  // Fetch currently active rules to populate the UI on open
  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const mainRule = currentRules.find(r => r.id === 1);

  if (mainRule && mainRule.action.requestHeaders) {
    mainRule.action.requestHeaders.forEach(h => createRow(h.header, h.value));
  } else {
    createRow('', ''); // Default empty row
  }

  addBtn.addEventListener('click', () => createRow('', ''));

  saveBtn.addEventListener('click', async () => {
    const rows = container.querySelectorAll('.row');
    const headersToSet = [];

    rows.forEach(row => {
      const name = row.querySelector('.header-name').value.trim();
      const value = row.querySelector('.header-value').value.trim();
      if (name) {
        headersToSet.push({
          header: name,
          operation: 'set',
          value: value
        });
      }
    });

    // ID 1 is used consistently to overwrite the existing configuration
    const removeRuleIds = [1]; 
    const addRules = [];

    if (headersToSet.length > 0) {
      addRules.push({
        id: 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: headersToSet
        },
        condition: {
          urlFilter: '*', // Apply globally to all URLs
          resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
        }
      });
    }

    try {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
      alert('Headers applied successfully!');
    } catch (err) {
      alert('Error saving headers: ' + err.message);
    }
  });

  function createRow(name, value) {
    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML = `
      <input type="text" class="header-name" placeholder="Header Name" value="${name}">
      <input type="text" class="header-value" placeholder="Value" value="${value}">
      <button class="remove-btn">X</button>
    `;
    div.querySelector('.remove-btn').addEventListener('click', () => div.remove());
    container.appendChild(div);
  }
});