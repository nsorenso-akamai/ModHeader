document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('header-list');
  const addBtn = document.getElementById('add-row');

  // 1. Load from Chrome Storage on initialization
  chrome.storage.local.get(['savedHeaders'], (result) => {
    const headers = result.savedHeaders || [];
    if (headers.length > 0) {
      headers.forEach(h => createRow(h.name, h.value, h.enabled));
    } else {
      createRow('', '', true); // Default empty, enabled row
    }
  });

  // Add new row and trigger a save
  addBtn.addEventListener('click', () => {
    createRow('', '', true);
    saveAndApplyHeaders();
  });

  // 2. The core Auto-Save logic (No alerts)
  async function saveAndApplyHeaders() {
    const rows = container.querySelectorAll('.row');
    const headersToSet = [];
    const allHeaders = []; 

    rows.forEach(row => {
      const enabled = row.querySelector('.header-enable').checked;
      const name = row.querySelector('.header-name').value.trim();
      const value = row.querySelector('.header-value').value.trim();

      if (name || value) {
        allHeaders.push({ name, value, enabled });
      }

      if (enabled && name) {
        headersToSet.push({
          header: name,
          operation: 'set',
          value: value
        });
      }
    });

    // Save UI state locally
    chrome.storage.local.set({ savedHeaders: allHeaders });

    // Build network rules
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
    } catch (err) {
      console.error('Failed to apply headers silently:', err);
    }
  }

  // 3. Helper function to debounce typing inputs
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // 4. Build rows and attach auto-save triggers to inputs
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
    
    // Auto-save when clicking the checkbox
    div.querySelector('.header-enable').addEventListener('change', saveAndApplyHeaders);
    
    // Auto-save when typing, waiting 500ms after typing stops
    div.querySelector('.header-name').addEventListener('input', debounce(saveAndApplyHeaders, 500));
    div.querySelector('.header-value').addEventListener('input', debounce(saveAndApplyHeaders, 500));
    
    // Auto-save when removing a row
    div.querySelector('.remove-btn').addEventListener('click', () => {
      div.remove();
      saveAndApplyHeaders();
    });
    
    container.appendChild(div);
  }
});