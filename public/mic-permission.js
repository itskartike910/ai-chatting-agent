document.addEventListener('DOMContentLoaded', () => {
    const requestButton = document.getElementById('requestPermission');
    const statusText = document.getElementById('status');

    requestButton.addEventListener('click', async () => {
        try {
            statusText.textContent = 'Requesting permission...';
            statusText.className = '';

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());

            statusText.textContent = 'Microphone permission granted! You can close this window.';
            statusText.className = 'success';
            requestButton.textContent = 'Permission Granted';
            requestButton.disabled = true;

            setTimeout(() => window.close(), 1500);
        } catch (error) {
            console.error('Permission denied or error:', error);
            if (error.name === 'NotAllowedError') {
                statusText.textContent = 'Permission denied. Please click "Allow" when the browser asks for microphone access, then try again.';
            } else if (error.name === 'NotFoundError') {
                statusText.textContent = 'No microphone found. Please check your audio devices.';
            } else {
                statusText.textContent = 'Error: ' + error.message;
            }
            statusText.className = 'error';
        }
    });

    // Check if already granted
    navigator.permissions
        .query({ name: 'microphone' })
        .then(status => {
            if (status.state === 'granted') {
                statusText.textContent = 'Microphone permission already granted!';
                statusText.className = 'success';
                requestButton.textContent = 'Already Granted';
                requestButton.disabled = true;
                setTimeout(() => window.close(), 1500);
            }
        })
        .catch(() => { });
});
