// CSRF agora é verificado em /auth/*, então todo POST precisa do token que
// só existe depois de uma request anterior (o attachCsrfToken seta o cookie).
export const primeCsrf = async (request) => {
  await request.get('/login');
  const state = await request.storageState();
  return state.cookies.find((c) => c.name === 'csrf_token')?.value;
};
