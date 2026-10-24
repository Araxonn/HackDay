// SafeShield Privacy Dashboard Controller
document.addEventListener('DOMContentLoaded', async () => {
  const storage = SafeShield.storage;

  const totalEl = document.getElementById('total-redactions');
  const emptyStateEl = document.getElementById('empty-state');
  const breakdownListEl = document.getElementById('breakdown-list');
  const btnReset = document.getElementById('btn-reset');

  const countPhoneEl = document.getElementById('count-phone');
  const countEmailEl = document.getElementById('count-email');
  const countAadhaarEl = document.getElementById('count-aadhaar');
  const countPanEl = document.getElementById('count-pan');

  const barPhoneEl = document.getElementById('bar-phone');
  const barEmailEl = document.getElementById('bar-email');
  const barAadhaarEl = document.getElementById('bar-aadhaar');
  const barPanEl = document.getElementById('bar-pan');

  function render(stats) {
    stats = stats || {};
    const phone = stats.PHONE || 0;
    const email = stats.EMAIL || 0;
    const aadhaar = stats.AADHAAR || 0;
    const pan = stats.PAN || 0;
    const total = phone + email + aadhaar + pan;

    totalEl.textContent = String(total);
    countPhoneEl.textContent = `${phone} (${total > 0 ? Math.round((phone / total) * 100) : 0}%)`;
    countEmailEl.textContent = `${email} (${total > 0 ? Math.round((email / total) * 100) : 0}%)`;
    countAadhaarEl.textContent = `${aadhaar} (${total > 0 ? Math.round((aadhaar / total) * 100) : 0}%)`;
    countPanEl.textContent = `${pan} (${total > 0 ? Math.round((pan / total) * 100) : 0}%)`;

    if (total === 0) {
      emptyStateEl.style.display = 'block';
      breakdownListEl.style.display = 'none';
      barPhoneEl.style.width = '0%';
      barEmailEl.style.width = '0%';
      barAadhaarEl.style.width = '0%';
      barPanEl.style.width = '0%';
    } else {
      emptyStateEl.style.display = 'none';
      breakdownListEl.style.display = 'flex';
      barPhoneEl.style.width = `${Math.round((phone / total) * 100)}%`;
      barEmailEl.style.width = `${Math.round((email / total) * 100)}%`;
      barAadhaarEl.style.width = `${Math.round((aadhaar / total) * 100)}%`;
      barPanEl.style.width = `${Math.round((pan / total) * 100)}%`;
    }
  }

  // Initial load
  const initialStats = await storage.getStats();
  render(initialStats);

  // Live storage sync
  storage.onChange((change) => {
    if (change.key === 'stats') {
      render(change.newValue);
    }
  });

  // Reset confirmation
  btnReset.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all SafeShield privacy statistics back to zero? This cannot be undone.',
    );
    if (confirmed) {
      await storage.resetStats();
      render({});
    }
  });
});
