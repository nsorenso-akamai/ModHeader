document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('header-list');
  const addBtn = document.getElementById('add-row');
  const saveBtn = document.getElementById('save');

  // 1. Load from Chrome Storage to preserve disabled headers
  chrome.storage.local.get(['savedHeaders'], (result) => {
    const headers = result.savedHeaders || [];
    if (headers.length > 0) {
      headers.forEach(h => createRow(h.name, h.value, h.enabled));
    } else {
      createRow('', '', true); // Default empty, enabled row
    }
  });

  addBtn.addEventListener('click', () => createRow('', '', true));

  saveBtn.addEventListener('click', async () => {
    const rows = container.querySelectorAll('.row');
    const headersToSet = [];
    const allHeaders = []; // For storing UI state

    // 2. Loop through UI to build storage array and injection array
    rows.forEach(row => {
      const enabled = row.querySelector('.header-enable').checked;
      const name = row.querySelector('.header-name').value.trim();
      const value = row.querySelector('.header-value').value.trim();

      // Save to UI state as long as it isn't completely blank
      if (name || value) {
        allHeaders.push({ name, value, enabled });
      }

      // Only push to the network injector if checked AND has a name
      if (enabled && name) {
        headersToSet.push({
          header: name,
          operation: 'set',
          value: value
        });
      }
    });

    // 3. Save the UI state to storage
    chrome.storage.local.set({ savedHeaders: allHeaders });

    // 4. Update the active network rules
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
          urlFilter: '*', 
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

  // Helper function to build the rows dynamically
  function createRow(name, value, enabled) {
    const div = document.createElement('div');
    div.className = 'row';
    const isChecked = enabled ? 'checked' : '';
    
    div.innerHTML = `
      <input type="checkbox" class="header-enable" ${isChecked} title="Toggle Header">
      <input type="text" class="header-name" placeholder="Header Name" value="${name}">
      <input type="text" class="header-value" placeholder="Value" value="${value}">
      <button class="remove-btn" title="Delete Row">X</button>
    `;
    
    div.querySelector('.remove-btn').addEventListener('click', () => div.remove());
    container.appendChild(div);
  }
});
