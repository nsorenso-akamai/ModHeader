document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('header-list');
  const addBtn = document.getElementById('add-row');

  // 1. Load from Chrome Storage on initialization
  chrome.storage.local.get(['savedHeaders'], (result) => {
    const headers = result.savedHeaders || [];
    if (headers.length > 0) {
      headers.forEach(h => createRow(h.name || '', h.value || '', h.excludes || '', h.enabled));
    } else {
      createRow('', '', '', true); // Default empty, enabled row
    }
  });

  addBtn.addEventListener('click', () => {
    createRow('', '', '', true);
    saveAndApplyHeaders();
  });

  // 2. The Auto-Save and Dynamic ID logic
  async function saveAndApplyHeaders() {
    const rows = container.querySelectorAll('.row');
    const allHeaders = []; 
    const addRules = [];

    // Each header now needs its own unique rule ID so they can have independent exceptions
    let ruleId = 1;

    rows.forEach(row => {
      const enabled = row.querySelector('.header-enable').checked;
      const name = row.querySelector('.header-name').value.trim();
      const value = row.querySelector('.header-value').value.trim();
      const excludes = row.querySelector('.header-excludes').value.trim();

      if (name || value || excludes) {
        allHeaders.push({ name, value, excludes, enabled });
      }

      if (enabled && name) {
        const condition = {
          urlFilter: '*', 
          resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
        };

        // Parse the comma-separated domains and append to the condition
        if (excludes) {
          const excludedDomains = excludes.split(',').map(d => d.trim()).filter(d => d.length > 0);
          if (excludedDomains.length > 0) {
            condition.excludedRequestDomains = excludedDomains;
          }
        }

        addRules.push({
          id: ruleId++, // Assigns the ID and increments it for the next loop
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [{
              header: name,
              operation: 'set',
              value: value
            }]
          },
          condition: condition
        });
      }
    });

    // Save UI state locally
    chrome.storage.local.set({ savedHeaders: allHeaders });

    try {
      // Find all currently active rules so we can properly wipe them before adding the new ones
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const removeRuleIds = existingRules.map(rule => rule.id);
      
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

  // 4. Build rows with the new Exceptions column
  function createRow(name, value, excludes, enabled) {
    const div = document.createElement('div');
    div.className = 'row';
    const isChecked = enabled ? 'checked' : '';
    
    div.innerHTML = `
      <input type="checkbox" class="header-enable" ${isChecked} title="Toggle Header">
      <input type="text" class="header-name" placeholder="Header Name" value="${name}">
      <input type="text" class="header-value" placeholder="Value" value="${value}">
      <input type="text" class="header-excludes" placeholder="Exceptions (e.g. site.com, test.local)" value="${excludes}">
      <button class="remove-btn" title="Delete Row">X</button>
    `;
    
    // Auto-save triggers
    div.querySelector('.header-enable').addEventListener('change', saveAndApplyHeaders);
    div.querySelector('.header-name').addEventListener('input', debounce(saveAndApplyHeaders, 500));
    div.querySelector('.header-value').addEventListener('input', debounce(saveAndApplyHeaders, 500));
    div.querySelector('.header-excludes').addEventListener('input', debounce(saveAndApplyHeaders, 500));
    
    div.querySelector('.remove-btn').addEventListener('click', () => {
      div.remove();
      saveAndApplyHeaders();
    });
    
    container.appendChild(div);
  }
});