// public/js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const logContainer = document.getElementById('admin-blockchain-data');

    async function loadAdminLog() {
        if (!logContainer) return;

        logContainer.innerHTML = `<p class="text-gray-500 italic">Loading system activity log...</p>`;

        try {
            // No auth needed for this simple admin view, but you SHOULD add it in a real app
            const response = await fetch('/api/admin/log');

            if (!response.ok) {
                throw new Error(`Failed to load admin log. Status: ${response.status}`);
            }

            const data = await response.json();
            logContainer.innerHTML = ''; // Clear loading state

            if (data.log && data.log.length > 0) {
                 // Display newest entries first
                data.log.slice().reverse().forEach(entry => {
                    const div = document.createElement('div');
                    div.className = 'log-entry'; // Use custom class for styling
                    div.innerHTML = `
                        <div><strong>Timestamp:</strong> ${new Date(entry.timestamp).toLocaleString()}</div>
                        <div><strong>User:</strong> ${entry.username || 'System'}</div>
                        <div><strong>Action:</strong> ${entry.action}</div>
                        <div><strong>Details:</strong> ${entry.details}</div>
                    `;
                    logContainer.appendChild(div);
                });
            } else {
                logContainer.innerHTML = '<p class="text-gray-600">No system activity logged yet.</p>';
            }

        } catch (error) {
            console.error('Error loading admin log:', error);
            logContainer.innerHTML = `<p class="text-red-500">An error occurred while loading the system log.</p>`;
        }
    }

    // Load the log when the page loads
    loadAdminLog();
});
