const validateToken = async (token: string, secret: string) => {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            response: token,
            secret
        }),
    })
    return await response.json().then(data => data.success)
}

export default validateToken