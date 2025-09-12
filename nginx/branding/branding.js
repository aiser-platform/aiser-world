// Simple branding overlay script injected into Cube UI
document.addEventListener('DOMContentLoaded', function () {
  try {
    // Fetch the branding config served by the proxy
    fetch('/branding/config.json')
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        // Create the primary brand bar
        var el = document.createElement('div');
        el.id = 'aiser-brand-bar';
        el.innerHTML = '<a href="' + (cfg.url || '/') + '" style="color:inherit;text-decoration:none;">' + (cfg.label || 'Aiser') + '</a>';
        el.style.position = 'fixed';
        el.style.top = '8px';
        el.style.right = '12px';
        el.style.zIndex = '99999';
        el.style.background = cfg.background || 'rgba(255,255,255,0.9)';
        el.style.padding = '6px 10px';
        el.style.borderRadius = '6px';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
        el.style.color = cfg.color || '#1890ff';
        document.body.appendChild(el);

        // Apply replacements if provided
        if (Array.isArray(cfg.replacements)) {
          cfg.replacements.forEach(function (rep) {
            try {
              var nodes = document.querySelectorAll(rep.selector);
              if (!nodes || nodes.length === 0) return;
              nodes.forEach(function (n) {
                if (rep.type === 'hide') {
                  n.style.display = 'none';
                } else if (rep.type === 'text') {
                  n.textContent = rep.value || '';
                } else if (rep.type === 'html') {
                  n.innerHTML = rep.value || '';
                } else if (rep.type === 'attr' && rep.attrName) {
                  n.setAttribute(rep.attrName, rep.value || '');
                }
              });
            } catch (e) {
              // ignore replacement errors
            }
          });
        }
      }).catch(function () {
        // fallback to default branding
        var el = document.createElement('div');
        el.id = 'aiser-brand-bar';
        el.innerHTML = '<a href="/" style="color:inherit;text-decoration:none;">Aiser</a>';
        el.style.position = 'fixed';
        el.style.top = '8px';
        el.style.right = '12px';
        el.style.zIndex = '99999';
        el.style.background = 'rgba(255,255,255,0.9)';
        el.style.padding = '6px 10px';
        el.style.borderRadius = '6px';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
        document.body.appendChild(el);
      });
  } catch (e) {
    // noop
  }
});


