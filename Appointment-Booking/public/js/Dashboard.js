// public/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const authToken = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');

    // If no token, redirect to login
    if (!authToken) {
        window.location.href = '/';
        return;
    }

    // --- Welcome Message ---
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage && username) {
        welcomeMessage.textContent = `Welcome, ${username}!`;
    }

    // --- Logout Button ---
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            // Optionally call a logout endpoint on the server
            fetch('/api/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } })
                .finally(() => {
                     window.location.href = '/'; // Redirect to login page
                });
        });
    }

    // --- Tab Switching Logic ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');

            // Update button styles
            tabButtons.forEach(btn => btn.classList.remove('active', 'bg-blue-600', 'text-white'));
            button.classList.add('active', 'bg-blue-600', 'text-white');


            // Hide all content, show the target content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tab}-content`) {
                    content.classList.add('active');
                    // Load data for the activated tab
                    loadTabData(tab, authToken);
                }
            });
        });
    });

    // --- Initial Data Load for the default tab ---
    loadTabData('records', authToken); // Load records initially

    // --- Function to Load Data for a Specific Tab ---
    async function loadTabData(tab, token) {
        const contentArea = document.getElementById(`${tab}-data`); // Assumes convention like 'records-data'
        if (!contentArea) return;

        contentArea.innerHTML = `<p class="text-gray-500 italic">Loading ${tab}...</p>`; // Show loading state

        try {
            const response = await fetch(`/api/${tab}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                 if (response.status === 401) { // Unauthorized
                     localStorage.removeItem('authToken');
                     localStorage.removeItem('username');
                     window.location.href = '/'; // Redirect to login
                     return;
                 }
                throw new Error(`Failed to load ${tab}. Status: ${response.status}`);
            }

            const data = await response.json();

            // --- Display Data Based on Tab ---
             contentArea.innerHTML = ''; // Clear loading state

            if (tab === 'records' && data.records) {
                if (data.records.length === 0) {
                    contentArea.innerHTML = '<p class="text-gray-600">No medical records found.</p>';
                } else {
                    data.records.forEach(record => {
                        const div = document.createElement('div');
                        div.className = 'p-3 border rounded-lg bg-gray-50';
                        div.innerHTML = `<strong>Date:</strong> ${record.date} <br> <strong>Notes:</strong> ${record.notes}`;
                        contentArea.appendChild(div);
                    });
                }
            } else if (tab === 'bills' && data.bills) {
                 if (data.bills.length === 0) {
                    contentArea.innerHTML = '<p class="text-gray-600">No bills found.</p>';
                } else {
                    data.bills.forEach(bill => {
                        const div = document.createElement('div');
                        div.className = 'p-3 border rounded-lg bg-gray-50 flex justify-between items-center';
                        div.innerHTML = `<span><strong>Date:</strong> ${bill.date} | <strong>Amount:</strong> $${bill.amount} | <strong>Status:</strong> ${bill.status}</span>`;
                        contentArea.appendChild(div);
                    });
                }
            } else if (tab === 'appointments' && data.appointments) {
                 if (data.appointments.length === 0) {
                    contentArea.innerHTML = '<p class="text-gray-600">No appointments found.</p>';
                } else {
                    data.appointments.forEach(appt => {
                        const div = document.createElement('div');
                        div.className = 'p-3 border rounded-lg bg-gray-50';
                        div.innerHTML = `<strong>Date:</strong> ${appt.date} <br> <strong>Reason:</strong> ${appt.reason}`;
                        contentArea.appendChild(div);
                    });
                }
            } else if (tab === 'blockchain' && data.log) {
                 if (data.log.length === 0) {
                    contentArea.innerHTML = '<p class="text-gray-600">No activity logged yet.</p>';
                } else {
                    // Display newest entries first
                    data.log.slice().reverse().forEach(entry => {
                        const div = document.createElement('div');
                        div.className = 'p-2 border-l-4 border-blue-400 bg-blue-50 text-xs mb-1 rounded-r-md';
                        div.innerHTML = `<strong>[${new Date(entry.timestamp).toLocaleString()}]</strong> ${entry.action} - ${entry.details}`;
                        contentArea.appendChild(div);
                    });
                }
            } else {
                 contentArea.innerHTML = `<p class="text-red-500">Could not display ${tab} data.</p>`;
            }

        } catch (error) {
            console.error(`Error loading ${tab}:`, error);
            contentArea.innerHTML = `<p class="text-red-500">An error occurred while loading ${tab}.</p>`;
        }
    }

    // --- Appointment Booking Form ---
    const appointmentForm = document.getElementById('appointment-form');
    const appointmentMessage = document.getElementById('appointment-message');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            appointmentMessage.textContent = '';

            const date = appointmentForm.date.value;
            const reason = appointmentForm.reason.value.trim();

            if (!date || !reason) {
                appointmentMessage.textContent = 'Please select a date and provide a reason.';
                appointmentMessage.className = 'mt-3 text-sm text-red-600';
                return;
            }

            try {
                const response = await fetch('/api/appointments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ date, reason }),
                });

                const result = await response.json();

                if (response.ok) {
                    appointmentMessage.textContent = 'Appointment booked successfully!';
                    appointmentMessage.className = 'mt-3 text-sm text-green-600';
                    appointmentForm.reset();
                    // Refresh appointment list and blockchain log
                    loadTabData('appointments', authToken);
                    loadTabData('blockchain', authToken); // Booking adds to the log
                } else {
                    appointmentMessage.textContent = result.message || 'Failed to book appointment.';
                    appointmentMessage.className = 'mt-3 text-sm text-red-600';
                }
            } catch (error) {
                console.error('Appointment booking error:', error);
                appointmentMessage.textContent = 'An error occurred while booking.';
                appointmentMessage.className = 'mt-3 text-sm text-red-600';
            }
        });
    }

     // --- Simulate Pay Bill Button ---
    const payBillButton = document.getElementById('pay-bill-button');
    if (payBillButton) {
        payBillButton.addEventListener('click', async () => {
             // In a real app, you'd select a specific bill to pay
            const billIdToPay = "simulated_bill_" + Date.now(); // Example ID
            const amountPaid = 100; // Example amount

            try {
                 const response = await fetch('/api/paybill', { // New endpoint needed
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ billId: billIdToPay, amount: amountPaid }),
                });

                 const result = await response.json();

                 if (response.ok) {
                    alert('Bill payment simulated successfully!'); // Use a modal in real app
                    // Refresh bills list and blockchain log
                    loadTabData('bills', authToken);
                    loadTabData('blockchain', authToken); // Payment adds to the log
                } else {
                    alert(result.message || 'Failed to simulate bill payment.');
                }
            } catch (error) {
                 console.error('Bill payment simulation error:', error);
                 alert('An error occurred during payment simulation.');
            }
        });
    }

});
