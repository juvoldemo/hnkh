/* Supabase REST client. Only the public anon key is shipped to the browser. */
window.Cloud = (() => {
  const config = window.SUPABASE_CONFIG;
  const sessionKey = 'hoi-ngo-auth';
  let session;
  try { session = JSON.parse(sessionStorage.getItem(sessionKey)); } catch {}
  const saveSession = value => { sessionStorage.setItem(sessionKey, JSON.stringify(value)); session = value; };
  let refreshing;
  async function request(path, options = {}, auth = true) {
    if (auth && !session) throw Error('Hãy đăng nhập Supabase để đồng bộ.');
    if (auth && session.expires_at * 1000 < Date.now() + 60000) {
      if (!refreshing) refreshing = request('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: JSON.stringify({refresh_token: session.refresh_token})
      }, false).then(saveSession).finally(() => { refreshing = null; });
      await refreshing;
    }
    const response = await fetch(config.url + path, {...options, signal: AbortSignal.timeout(30000), headers: {
      apikey: config.anonKey, Authorization: 'Bearer ' + (auth ? session.access_token : config.anonKey),
      'Content-Type': 'application/json', ...options.headers
    }});
    if (!response.ok) {
      if (response.status === 409) throw Error('Hội nghị đã thay đổi trên thiết bị khác. Hãy sao lưu bản cục bộ trước khi tải lại bản trên máy chủ.');
      throw Error('Supabase trả lỗi ' + response.status + '. Kiểm tra đăng nhập, bảng dữ liệu và quyền truy cập.');
    }
    if (options.blob) return response.blob();
    const body = await response.text();
    return body ? JSON.parse(body) : null;
  }
  return {
    get user() { return session?.user; },
    storageKey: 'hoi-ngo-conferences-v1' + (session?.user ? ':' + session.user.id : ''),
    async login(email, password) {
      const data = await request('/auth/v1/token?grant_type=password', {method:'POST', body:JSON.stringify({email,password})}, false);
      saveSession(data);
      const key = 'hoi-ngo-conferences-v1:' + data.user.id;
      if (!localStorage.getItem(key)) {
        const local = JSON.parse(localStorage.getItem('hoi-ngo-conferences-v1') || 'null');
        if (local) { local.conferences = local.conferences.filter(c => !c.demo); if (local.conferences.length) localStorage.setItem(key, JSON.stringify(local)); }
      }
    },
    logout() { sessionStorage.removeItem(sessionKey); location.reload(); },
    list: () => request('/rest/v1/hn_conferences?select=id,payload,revision&order=created_at.asc'),
    save: (conference, revision) => request('/rest/v1/rpc/hn_save_conference', {method:'POST', body:JSON.stringify({conference_id:conference.id, data:conference, expected_revision:revision})}),
    async upload(conferenceId, imageId, file) {
      if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 20 * 1024 * 1024) throw Error('Ảnh phải là JPG, PNG, WebP hoặc GIF, tối đa 20 MB.');
      const path = session.user.id + '/' + conferenceId + '/' + imageId;
      await request('/storage/v1/object/conference-images/' + path, {method:'POST', headers:{'Content-Type':file.type, 'x-upsert':'true'}, body:file});
      return 'supabase:' + path;
    },
    image: key => request('/storage/v1/object/authenticated/conference-images/' + key.slice(9).split('/').map(encodeURIComponent).join('/'), {blob:true})
  };
})();
