/* Supabase REST client. Only the public anon key is shipped to the browser. */
window.Cloud = (() => {
  const config = window.SUPABASE_CONFIG;
  async function request(path, options = {}) {
    const response = await fetch(config.url + path, {...options, signal: AbortSignal.timeout(30000), headers: {
      apikey: config.anonKey, Authorization: 'Bearer ' + config.anonKey,
      'Content-Type': 'application/json', ...options.headers
    }});
    if (!response.ok) {
      if (response.status === 409) throw Error('Hội nghị đã thay đổi trên thiết bị khác. Hãy sao lưu bản cục bộ trước khi tải lại bản trên máy chủ.');
      throw Error('Supabase trả lỗi ' + response.status + '. Kiểm tra cấu hình bảng dữ liệu và quyền truy cập không cần đăng nhập.');
    }
    if (options.blob) return response.blob();
    const body = await response.text();
    return body ? JSON.parse(body) : null;
  }
  return {
    storageKey: 'hoi-ngo-conferences-v1',
    async advisors() {
      let response=await fetch('/api/advisors',{signal:AbortSignal.timeout(30000)});
      // Live Server serves static files only; use the local Node API automatically.
      if(response.status===404&&['localhost','127.0.0.1'].includes(location.hostname)&&location.port!=='3000'){
        response=await fetch('http://'+location.hostname+':3000/api/advisors',{signal:AbortSignal.timeout(30000)});
      }
      if(!response.ok)throw Error('Chưa tải được danh sách TVV.');
      const advisors=await response.json();
      if(!Array.isArray(advisors))throw Error('Danh sách TVV không hợp lệ.');
      return advisors;
    },
    list: () => request('/rest/v1/hn_conferences?select=id,payload,revision&order=created_at.asc'),
    save: (conference, revision) => request('/rest/v1/rpc/hn_save_conference', {method:'POST', body:JSON.stringify({conference_id:conference.id, data:conference, expected_revision:revision})}),
    async upload(conferenceId, imageId, file) {
      if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 20 * 1024 * 1024) throw Error('Ảnh phải là JPG, PNG, WebP hoặc GIF, tối đa 20 MB.');
      const path = 'shared/' + conferenceId + '/' + imageId;
      await request('/storage/v1/object/conference-images/' + path, {method:'POST', headers:{'Content-Type':file.type, 'x-upsert':'true'}, body:file});
      return 'supabase:' + path;
    },
    image: key => request('/storage/v1/object/authenticated/conference-images/' + key.slice(9).split('/').map(encodeURIComponent).join('/'), {blob:true})
  };
})();
