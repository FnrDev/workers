export const respond = (body) => {
    return new Response(JSON.stringify(body), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};