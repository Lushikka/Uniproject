function handleError(error, errorType = 'default') {
    const errorTypes = {
        unauthorized: { code: '401', message: 'Unauthorized Access' },
        notFound: { code: '404', message: 'Page Not Found' },
        serverError: { code: '500', message: 'Server Error' },
        default: { code: '400', message: error.message || 'Something went wrong' }
    };

    const errorDetails = errorTypes[errorType] || errorTypes.default;
    sessionStorage.setItem('errorDetails', JSON.stringify(errorDetails));
    window.location.href = '../errorpage/error.html';
}