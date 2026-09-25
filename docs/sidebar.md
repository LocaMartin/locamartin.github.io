# Sidebar Architecture & Template Integration Guide

## Overview
The navigation sidebar utilizes an automated template engine driven by `sidebar-config.js`. You do not need to manually edit `index.html` or core layout CSS files when modifying sidebar views.

---

## How to Add a New Template to the Sidebar

### Step 1: Create the JS Template File
Create a new file under `res/js/templates/my-view.js`:

```javascript
window.MyViewTemplate = {
  // Executed when sidebar item is clicked
  init() {
    const panel = document.getElementById("panel-my-view");
    if (panel) {
      panel.innerHTML = `<div>Sidebar Preview Content</div>`;
    }
  },

  // Executed when expandable fullscreen button is clicked
  loadFull() {
    const fp = document.getElementById("fp-body-my-view");
    if (fp) {
      fp.innerHTML = `<div>Fullpage View Content</div>`;
    }
  }
};
```

### Step 2: Register in `res/js/sidebar-config.js`
Add an entry object to `window.SIDEBAR_CONFIG`:

```javascript
{
  id: "my-view",
  title: "My New View",
  badge: "NEW",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`,
  hasFullpage: true,
  init: () => window.MyViewTemplate?.init?.(),
  loadFull: () => window.MyViewTemplate?.loadFull?.()
}
```

### Step 3: Include script tag in `index.html`
```html
<script src="res/js/templates/my-view.js" defer></script>
```
## How to Remove a Template from the Sidebar
1. Open `res/js/sidebar-config.js`.
2. Delete or comment out the target object in `window.SIDEBAR_CONFIG`.
3. (Optional) Remove the corresponding script tag from `index.html`.