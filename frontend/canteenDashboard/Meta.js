document.addEventListener('DOMContentLoaded', () => {
    const API = (typeof window !== 'undefined' && window.API_BASE) ? String(window.API_BASE).replace(/\/$/, '') : 'http://localhost:3000';
    let modalContainer;

    // Initialize modal container
    function createModalContainer() {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modalContainer';
        modalContainer.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
        `;
        document.body.appendChild(modalContainer);
    }

    createModalContainer();

    const canteenId = (window.CANTEEN_ID ? String(window.CANTEEN_ID) : (document.body && document.body.getAttribute('data-canteen-id')) ) || '3';

    // Data loading and CRUD helpers
    async function loadMenuItems() {
        try {
            const response = await fetch(`${API}/menu-items?canteen_id=${encodeURIComponent(canteenId)}`);
            const data = await response.json();
            if (data.success) {
                renderMenuItems(data.items);
                updateStats(data.stats);
            }
        } catch (error) {
            console.error('Error loading menu items:', error);
        }
    }

    function updateStats(stats) {
        const totalEl = document.getElementById('totalItems');
        const availEl = document.getElementById('availableItems');
        const unavailEl = document.getElementById('unavailableItems');
        if (totalEl) totalEl.textContent = stats.total ?? 0;
        if (availEl) availEl.textContent = stats.available ?? 0;
        if (unavailEl) unavailEl.textContent = stats.unavailable ?? 0;
    }

    function renderMenuItems(items) {
        const tbody = document.querySelector('#menuItemsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = items.map(item => `
            <tr data-id="${item.id}">
                <td>${item.item_name || item.name}</td>
                <td>${item.status === 'Available' ? '<span class="status-available">Available</span>' : '<span class="status-unavailable">UnAvailable</span>'}</td>
                <td><span class="${(item.type || '').toLowerCase().includes('veg') ? 'type-veg' : 'type-nonveg'}">${item.type}</span></td>
                <td>Rs ${item.price}</td>
                <td class="actions">
                    <button onclick="editMenuItem(${item.id})" class="action-btn edit">
                        <img src="../Images/edit.png" alt="Edit">
                    </button>
                    <button onclick="toggleItemVisibility(${item.id})" class="action-btn hide">
                        <img src="${item.status === 'Available' ? '../Images/visible.png' : '../Images/invisible.png'}" alt="${item.status === 'Available' ? 'Hide' : 'Show'}">
                    </button>
                    <button onclick="deleteMenuItem(${item.id})" class="action-btn delete">
                        <img src="../Images/del.png" alt="Delete">
                    </button>
                </td>
            </tr>
        `).join('');
    }

    window.toggleItemVisibility = async function(id) {
        try {
            const response = await fetch(`${API}/menu-items/${id}/toggle`, { method: 'PATCH' });
            if (response.ok) {
                loadMenuItems();
            }
        } catch (error) {
            console.error('Error toggling visibility:', error);
        }
    };

    window.deleteMenuItem = async function(id) {
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                const response = await fetch(`${API}/menu-items/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    loadMenuItems();
                }
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }
    };

    function handleAddFormSubmission(event) {
        if (event.data && event.data.type === 'formSubmission') {
            const formData = event.data.formData;
            fetch(`${API}/add-menu-item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    closeModal();
                    loadMenuItems();
                } else {
                    alert(data.message || 'Failed to add item');
                }
            })
            .catch(err => {
                console.error('Error adding menu item:', err);
                alert('Failed to add menu item');
            });
        }
    }

    // Call initial load
    loadMenuItems();

    // Logout button handler
    document.querySelector('.logout-btn').addEventListener('click', () => {
        if(confirm('Are you sure you want to logout?')) {
            // Clear any session data
            sessionStorage.clear();
            // Redirect to homepage
            window.location.href = "../homepage/index.html";
        }
    });

    // Add button handler - Show popup instead of redirect
    document.querySelector('.add-btn').addEventListener('click', () => {
        const iframe = document.createElement('iframe');
        iframe.src = 'MetaAdd_form.html';
        iframe.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 500px;
            height: 600px;
            border: none;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            background: white;
            z-index: 1000;
        `;
        modalContainer.innerHTML = '';
        modalContainer.appendChild(iframe);
        modalContainer.style.display = 'flex';
        window.addEventListener('message', handleAddFormSubmission);
    });

    // Edit button handler - open modal and preload item
    window.editMenuItem = async function(itemId) {
        try {
            const response = await fetch(`${API}/menu-items/${itemId}`);
            const data = await response.json();
            if (!data.success) return;

            const iframe = document.createElement('iframe');
            iframe.src = 'MetaEdit_form.html';
            iframe.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 500px;
                height: 600px;
                border: none;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                background: white;
                z-index: 1000;
            `;
            modalContainer.innerHTML = '';
            modalContainer.appendChild(iframe);
            modalContainer.style.display = 'flex';

            iframe.onload = () => {
                iframe.contentWindow.postMessage({ type: 'editItemData', item: data.item }, '*');
            };
        } catch (error) {
            console.error('Error loading item:', error);
        }
    };

    // Handle edit form submission from iframe
    window.addEventListener('message', async function(event) {
        if (event.data && event.data.type === 'editFormSubmission') {
            try {
                const res = await fetch(`${API}/menu-items/${event.data.formData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(event.data.formData)
                });
                if (res.ok) {
                    closeModal();
                    loadMenuItems();
                } else {
                    alert('Failed to update item');
                }
            } catch (err) {
                console.error('Error updating item:', err);
                alert('Failed to update item');
            }
        }
    });

    // Hide button handler
    document.querySelectorAll('.action-btn.hide').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.closest('tr').dataset.id;
            if(confirm('Set this item as unavailable?')) {
                // Add API call to update availability
                alert('Item set as unavailable');
            }
        });
    });

    // Delete button handler
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.closest('tr').dataset.id;
            if(confirm('Are you sure you want to delete this item?')) {
                // Add API call to delete item
                alert('Item deleted');
            }
        });
    });

    // Close modal function
    window.closeModal = function() {
        if (modalContainer) {
            modalContainer.style.display = 'none';
            modalContainer.innerHTML = '';
        }
        // Remove add-form listener if attached
        window.removeEventListener('message', handleAddFormSubmission);
    };

    // Close modal when clicking outside
    modalContainer.addEventListener('click', function(e) {
        if (e.target === modalContainer) {
            closeModal();
        }
    
    });
    // wire logout
		const logout = document.querySelector('.logout-btn');
		if (logout) logout.addEventListener('click', ()=>{ window.location.href = '../Admin/AdminLogin.html'; });
});