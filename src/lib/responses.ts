export function ok(text = 'Ok') {
  return handleResponse(200, text);
}

function handleResponse(statusCode: number, text: string) {
  return {
    body: text,
    statusCode,
  };
}
