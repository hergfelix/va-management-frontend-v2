// Onboarding & Offboarding Logic

// Show/hide phone transfer field based on phone type selection (onboarding)
document.getElementById('onboarding-phone-type')?.addEventListener('change', function(e) {
    const transferGroup = document.getElementById('phone-transfer-group');
    if (e.target.value === 'transfer') {
        transferGroup.style.display = 'block';
        // Populate VA select with active VAs
        const select = document.getElementById('phone-from-va-select');
        if (currentData.vas) {
            select.innerHTML = '<option value="">Select VA...</option>' +
                currentData.vas
                    .filter(va => va.status === 'active')
                    .map(va => `<option value="${va.id}">${va.full_name}</option>`)
                    .join('');
        }
    } else {
        transferGroup.style.display = 'none';
    }
});

// Show/hide phone transfer field based on phone handling selection (offboarding)
document.getElementById('offboard-phone-handling')?.addEventListener('change', function(e) {
    const transferGroup = document.getElementById('offboard-phone-transfer-group');
    if (e.target.value === 'transfer') {
        transferGroup.style.display = 'block';
        // Populate VA select with active VAs
        const select = document.getElementById('offboard-phone-transfer-select');
        if (currentData.vas) {
            select.innerHTML = '<option value="">Select VA...</option>' +
                currentData.vas
                    .filter(va => va.status === 'active')
                    .map(va => `<option value="${va.id}">${va.full_name}</option>`)
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
        const payload = {
            apple_code_provided: data.get('apple_code_provided') === 'on',
            proxy_configured: data.get('proxy_configured') === 'on',
            training_materials_provided: data.get('training_materials_provided') === 'on',
            phone_type: data.get('phone_type'),
            phone_from_va_id: data.get('phone_from_va_id') ? parseInt(data.get('phone_from_va_id')) : null
        };

        console.log('Complete Onboarding Payload:', payload);

        await api(`/vas/${vaId}/complete-onboarding`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        hideModal('complete-onboarding-modal');
        await loadVAs();
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
        showToast('VA offboarded successfully');
    } catch (err) {
        console.error('Offboard VA error:', err);
        showToast('Failed to offboard VA: ' + err.message, 'error');
    }
});
