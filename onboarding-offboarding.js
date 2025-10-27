// Onboarding & Offboarding Logic

// Search filtering for VA dropdowns
function setupDropdownSearch(searchInputId, selectId) {
    const searchInput = document.getElementById(searchInputId);
    const select = document.getElementById(selectId);

    if (searchInput && select) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const options = Array.from(select.options);

            options.forEach(option => {
                if (option.value === '') {
                    option.style.display = 'block'; // Always show placeholder
                } else {
                    const text = option.textContent.toLowerCase();
                    option.style.display = text.includes(searchTerm) ? 'block' : 'none';
                }
            });
        });
    }
}

// Initialize search functionality when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setupDropdownSearch('phone-from-va-search', 'phone-from-va-select');
    setupDropdownSearch('offboard-phone-transfer-search', 'offboard-phone-transfer-select');
});

// Show/hide phone transfer field and phone details based on phone type selection (onboarding)
document.getElementById('onboarding-phone-type')?.addEventListener('change', async function(e) {
    const transferGroup = document.getElementById('phone-transfer-group');
    const phoneDetailsGroup = document.getElementById('phone-details-group');

    if (e.target.value === 'transfer') {
        transferGroup.style.display = 'block';
        phoneDetailsGroup.style.display = 'none'; // Hide phone details for transfer
        // Populate VA select with ALL VAs (active + archived) to allow phone transfer from offboarded VAs
        const select = document.getElementById('phone-from-va-select');
        if (currentData.vas) {
            // Fetch archived VAs as well
            let archivedVAs = [];
            try {
                archivedVAs = await api('/vas/archived/list');
            } catch (err) {
                console.error('Failed to fetch archived VAs:', err);
            }

            // Combine active and archived VAs
            const allVAs = [...currentData.vas, ...archivedVAs];

            select.innerHTML = '<option value="">Select VA...</option>' +
                allVAs
                    .map(va => {
                        const label = va.status === 'archived' ? `${va.full_name} (Archived)` : va.full_name;
                        return `<option value="${va.id}">${label}</option>`;
                    })
                    .join('');
        }
    } else if (e.target.value === 'new') {
        transferGroup.style.display = 'none';
        phoneDetailsGroup.style.display = 'block'; // Show phone details for new phone
    } else {
        transferGroup.style.display = 'none';
        phoneDetailsGroup.style.display = 'none';
    }
});

// Show/hide phone transfer field based on phone handling selection (offboarding)
document.getElementById('offboard-phone-handling')?.addEventListener('change', async function(e) {
    const transferGroup = document.getElementById('offboard-phone-transfer-group');
    if (e.target.value === 'transfer') {
        transferGroup.style.display = 'block';
        // Populate VA select with ALL VAs (active + archived) to allow phone transfer from offboarded VAs
        const select = document.getElementById('offboard-phone-transfer-select');
        if (currentData.vas) {
            // Fetch archived VAs as well
            let archivedVAs = [];
            try {
                archivedVAs = await api('/vas/archived/list');
            } catch (err) {
                console.error('Failed to fetch archived VAs:', err);
            }

            // Combine active and archived VAs
            const allVAs = [...currentData.vas, ...archivedVAs];

            select.innerHTML = '<option value="">Select VA...</option>' +
                allVAs
                    .map(va => {
                        const label = va.status === 'archived' ? `${va.full_name} (Archived)` : va.full_name;
                        return `<option value="${va.id}">${label}</option>`;
                    })
                    .join('');
        }
    } else {
        transferGroup.style.display = 'none';
    }
});

// Handle Complete Onboarding button click
document.addEventListener('click', async function(e) {
    const target = e.target.closest('[data-action="complete-onboarding"]');
    if (target) {
        const vaId = target.dataset.id;
        const vaName = target.dataset.name;

        // Find VA data
        const va = currentData.vas?.find(v => v.id == vaId);
        if (!va) {
            showToast('VA not found', 'error');
            return;
        }

        // Populate modal
        document.getElementById('onboarding-va-id').value = vaId;
        document.getElementById('onboarding-va-info').innerHTML = `
            <div><strong>Name:</strong> ${va.full_name}</div>
            <div><strong>Telegram:</strong> @${va.telegram_handle}</div>
            <div><strong>Type:</strong> ${va.va_type}</div>
            ${va.onboarding_date ? `<div><strong>Started:</strong> ${new Date(va.onboarding_date).toLocaleDateString()}</div>` : ''}
        `;

        // Reset form
        document.getElementById('complete-onboarding-form').reset();
        document.getElementById('onboarding-va-id').value = vaId;
        document.getElementById('phone-transfer-group').style.display = 'none';
        document.getElementById('phone-details-group').style.display = 'none';

        // Show modal
        showModal('complete-onboarding-modal');
    }
});

// Handle Offboard VA button click
document.addEventListener('click', async function(e) {
    const target = e.target.closest('[data-action="offboard-va"]');
    if (target) {
        const vaId = target.dataset.id;
        const vaName = target.dataset.name;

        // Find VA data
        const va = currentData.vas?.find(v => v.id == vaId);
        if (!va) {
            showToast('VA not found', 'error');
            return;
        }

        // Populate modal
        document.getElementById('offboard-va-id').value = vaId;
        document.getElementById('offboard-va-info').innerHTML = `
            <div><strong>Name:</strong> ${va.full_name}</div>
            <div><strong>Telegram:</strong> @${va.telegram_handle}</div>
            <div><strong>Type:</strong> ${va.va_type}</div>
            ${va.onboarding_date ? `<div><strong>Started:</strong> ${new Date(va.onboarding_date).toLocaleDateString()}</div>` : ''}
            <div><strong>Current Status:</strong> ${va.status}</div>
        `;

        // Reset form
        document.getElementById('offboard-va-form').reset();
        document.getElementById('offboard-va-id').value = vaId;
        document.getElementById('offboard-phone-transfer-group').style.display = 'none';

        // Show modal
        showModal('offboard-va-modal');
    }
});

// Handle Complete Onboarding Form Submit
document.getElementById('complete-onboarding-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    const vaId = data.get('va_id');

    try {
        const phoneType = data.get('phone_type');
        const payload = {
            apple_code_provided: data.get('apple_code_provided') === 'on',
            proxy_configured: data.get('proxy_configured') === 'on',
            training_materials_provided: data.get('training_materials_provided') === 'on',
            phone_type: phoneType,
            phone_from_va_id: data.get('phone_from_va_id') ? parseInt(data.get('phone_from_va_id')) : null
        };

        console.log('Complete Onboarding Payload:', payload);

        // Complete onboarding first
        await api(`/vas/${vaId}/complete-onboarding`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // If phone_type is "new", create the phone with all details
        if (phoneType === 'new') {
            const phoneData = {
                phone_number: data.get('phone_number'),
                handout_date: data.get('handout_date') || null,
                apple_id_email: data.get('apple_id_email') || null,
                apple_id_password: data.get('apple_id_password') || null,
                proxy_ip: data.get('proxy_ip') || null,
                proxy_port: data.get('proxy_port') ? parseInt(data.get('proxy_port')) : null,
                proxy_username: data.get('proxy_username') || null,
                proxy_password: data.get('proxy_password') || null,
                notes: data.get('phone_notes') || null,
                assigned_to_va_id: parseInt(vaId)
            };

            console.log('Creating new phone:', phoneData);

            await api('/phones', {
                method: 'POST',
                body: JSON.stringify(phoneData)
            });
        }

        hideModal('complete-onboarding-modal');
        await loadVAs();
        if (phoneType === 'new') {
            await loadPhones(); // Reload phones if we created one
        }
        showToast('Onboarding completed successfully! ✓');
    } catch (err) {
        console.error('Complete onboarding error:', err);
        showToast('Failed to complete onboarding: ' + err.message, 'error');
    }
});

// Handle Offboard VA Form Submit
document.getElementById('offboard-va-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    const vaId = data.get('va_id');

    const phoneHandling = data.get('phone_handling');

    try {
        const payload = {
            reason: data.get('reason'),
            reason_details: data.get('reason_details'),
            final_payment: data.get('final_payment') ? parseFloat(data.get('final_payment')) : null,
            phone_transferred_to_va_id: phoneHandling === 'transfer' && data.get('phone_transferred_to_va_id') ?
                parseInt(data.get('phone_transferred_to_va_id')) : null,
            phone_returned_to_inventory: phoneHandling === 'inventory',
            notes: data.get('notes'),
            offboarded_by: data.get('offboarded_by')
        };

        console.log('Offboard VA Payload:', payload);

        await api(`/vas/${vaId}/offboard`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        hideModal('offboard-va-modal');
        await loadVAs();
        await loadCreators(); // Refresh creator list to remove offboarded VAs
        showToast('VA offboarded successfully');
    } catch (err) {
        console.error('Offboard VA error:', err);
        showToast('Failed to offboard VA: ' + err.message, 'error');
    }
});
