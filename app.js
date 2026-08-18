const modal = document.querySelector('#passwordModal');
const passwordForm = document.querySelector('#passwordForm');
const passwordInput = document.querySelector('#passwordInput');
const errorMessage = document.querySelector('#errorMessage');
const selectedFile = document.querySelector('#selectedFile');
const toast = document.querySelector('#toast');
let activeDownload = null; // Keeping the variable for download tracking
const accessScreen = document.querySelector('#accessScreen');
const accessForm = document.querySelector('#accessForm');
const accessUsername = document.querySelector('#accessEmail');
const accessPassword = document.querySelector('#accessPassword');
const accessTitle = document.querySelector('#accessTitle');
const accessCopy = document.querySelector('#accessCopy');
const accessSubmit = document.querySelector('#accessSubmit');
const accessError = document.querySelector('#accessError');
const requestAccess = document.querySelector('#requestAccess');
const accessPasswordLabel = document.querySelector('label[for="accessPassword"]');
const accessUsernameLabel = document.querySelector('label[for="accessEmail"]');
const adminPanel = document.querySelector('#adminPanel');
const adminLoginView = document.querySelector('#adminLoginView');
const adminDashboard = document.querySelector('#adminDashboard');
let requestMode = false;

const supabaseClient = window.supabase.createClient(
  'https://cqrbmrmoycjkbfqstjyb.supabase.co',
  'sb_publishable_QYmVA0yuDX9dTtQb5P3vtg_jW9vEhCN'
);

const adminCredentials = { username: 'chanlovecookies', password: 'andrewlols' };
const approvedUsers = JSON.parse(localStorage.getItem('xplaneApprovedUsers') || '[]').filter((user) => user !== 'owner@xplane.dev').map((user) => typeof user === 'string' ? { username: user, name: user, password: 'xplane' } : { username: user.username || user.email, name: user.name, password: user.password });
const pendingRequests = JSON.parse(localStorage.getItem('xplanePendingRequests') || '[]').filter((request) => request.email !== 'pilot@northstar.dev').map((request) => ({ username: request.username || request.email, name: request.name }));
let currentUser = null;

['accessEmail', 'adminEmail', 'personEmail'].forEach((id) => {
  const input = document.querySelector(`#${id}`);
  if (input) {
    input.type = 'text';
    input.placeholder = 'Username';
  }
});
document.querySelector('label[for="accessEmail"]')?.replaceChildren('Username');
document.querySelector('label[for="adminEmail"]')?.replaceChildren('Admin username');
document.querySelector('label[for="personEmail"]')?.replaceChildren('Username');
document.querySelector('.collection-label')?.remove();

document.querySelectorAll('.collection-section').forEach((section) => section.remove());
document.querySelector('.collection-nav').replaceChildren();
const savedSections = JSON.parse(localStorage.getItem('xplaneSections') || '[]');
const savedFiles = JSON.parse(localStorage.getItem('xplaneFiles') || '[]');
const sections = [];
const emptyFiles = document.createElement('div');
emptyFiles.className = 'empty-files';
emptyFiles.id = 'emptyFiles';
emptyFiles.textContent = 'No files yet. An admin can add a section and upload files here.';
document.querySelector('#files').after(emptyFiles);
document.querySelector('.hero-stamp p').innerHTML = '0 files<br /><strong>0 sections</strong>';

function persistSections() {
  localStorage.setItem('xplaneSections', JSON.stringify(sections.map((section) => section.name)));
  supabaseClient.from('sections').upsert(sections.map((section) => ({ name: section.name })), { onConflict: 'name' }).then(({ error }) => {
    if (error) console.error('Could not save sections to Supabase:', error.message);
  });
  window.dispatchEvent(new CustomEvent('xplane-data-updated'));
}

function sectionSlug(name) {
  return `section-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`;
}

function createSection(name) {
  const section = { name, id: sectionSlug(name) };
  const element = document.createElement('section');
  element.className = 'collection-section';
  element.id = section.id;
  element.innerHTML = `<div class="section-heading"><div><span class="section-marker coral"></span><h2></h2><span class="file-total">0 files</span></div></div><div class="file-list"></div>`;
  element.querySelector('h2').textContent = name;
  document.querySelector('#files').after(element);
  const navLink = document.createElement('a');
  navLink.href = `#${section.id}`;
  navLink.innerHTML = '<span class="collection-swatch coral"></span><span></span>';
  navLink.querySelector('span:last-child').textContent = name;
  document.querySelector('.collection-nav').appendChild(navLink);
  sections.push({ ...section, element, navLink });
  emptyFiles.hidden = sections.length > 0;
  refreshSectionChoices();
  return section;
}

savedSections.forEach((name) => createSection(name));
savedFiles.forEach((file) => {
  const section = sections.find((item) => item.name === file.sectionName);
  if (section) appendFileToSection(section, file);
});

function persistFiles() {
  const files = [];
  sections.forEach((section) => section.element.querySelectorAll('.file-row').forEach((row) => {
    files.push({ name: row.dataset.name, size: row.dataset.size, password: row.dataset.password, sectionName: section.name, extension: row.dataset.extension, storagePath: row.dataset.storagePath });
  }));
  localStorage.setItem('xplaneFiles', JSON.stringify(files));
  Promise.all(files.filter((file) => file.storagePath).map(async (file) => {
    const { data: section } = await supabaseClient.from('sections').select('id').eq('name', file.sectionName).maybeSingle();
    if (!section) return;
    const { error } = await supabaseClient.from('files').upsert({ name: file.name, size: file.size, password: file.password, extension: file.extension, section_id: section.id, storage_path: file.storagePath }, { onConflict: 'storage_path' });
    if (error) console.error('Could not save file to Supabase:', error.message);
  }));
  window.dispatchEvent(new CustomEvent('xplane-data-updated'));
}

function appendFileToSection(section, file) {
  const row = document.createElement('article');
  row.className = 'file-row';
  row.dataset.name = file.name;
  row.dataset.size = file.size;
  row.dataset.password = file.password || '';
  row.dataset.extension = file.extension || 'FILE';
  row.dataset.storagePath = file.storagePath || '';
  row.fileBlob = file.blob || null;
  row.innerHTML = `<div class="file-type doc">${row.dataset.extension}</div><div class="file-info"><h3></h3><p>${section.name} <span>•</span> Added by admin</p></div><div class="file-size">${file.size}</div><span class="lock">⌑</span><button class="download-button" data-file="${file.name}" data-size="${file.size}" aria-label="Download ${file.name}">↓</button>`;
  row.querySelector('h3').textContent = file.name;
  section.element.querySelector('.file-list').prepend(row);
  section.element.querySelector('.file-total').textContent = `${section.element.querySelectorAll('.file-row').length} files`;
  row.querySelector('.download-button').addEventListener('click', () => startDownload(row));
}

function startDownload(row) {
  activeDownload = row;
  selectedFile.textContent = row.dataset.name;
  passwordInput.value = '';
  errorMessage.classList.remove('show');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  passwordInput.focus();
}

function downloadFile(row) {
  const downloadBlob = row.fileBlob || (row.dataset.storagePath ? null : new Blob([`Xplane Files\n${row.dataset.name}\nSection: ${row.closest('.collection-section')?.querySelector('h2')?.textContent || 'Files'}`], { type: 'text/plain' }));
  if (!downloadBlob && row.dataset.storagePath) {
    const { data } = supabaseClient.storage.from('xplane-files').getPublicUrl(row.dataset.storagePath);
    window.open(data.publicUrl, '_blank', 'noopener');
    showToast(`${row.dataset.name} download started`);
    return;
  }
  const url = URL.createObjectURL(downloadBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = row.dataset.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`${row.dataset.name} download started`);
}

function refreshSectionChoices() {
  const select = document.querySelector('#uploadSection');
  if (!select) return;
  select.innerHTML = '';
  sections.forEach((section) => {
    const option = document.createElement('option');
    option.value = section.id;
    option.textContent = section.name;
    select.appendChild(option);
  });
  select.disabled = sections.length === 0;
}

function removeSection(index) {
  const [section] = sections.splice(index, 1);
  if (!section) return;
  supabaseClient.from('sections').delete().eq('name', section.name).then(({ error }) => {
    if (error) console.error('Could not remove section from Supabase:', error.message);
  });
  section.element.remove();
  section.navLink.remove();
  persistSections();
  persistFiles();
  emptyFiles.hidden = sections.length > 0;
  renderSectionEditor();
  refreshSectionChoices();
  showToast(`${section.name} removed`);
}

function renderSectionEditor() {
  const list = document.querySelector('#sectionList');
  if (!list) return;
  list.innerHTML = '';
  if (!sections.length) {
    list.innerHTML = '<div class="empty-state">No sections yet.</div>';
    renderAdminFiles();
    return;
  }
  sections.forEach((section, index) => {
    const row = document.createElement('div');
    row.className = 'section-editor-row';
    row.innerHTML = `<span class="collection-swatch coral"></span><strong></strong><small></small><button type="button" class="remove-button">Remove</button>`;
    row.querySelector('strong').textContent = section.name;
    row.querySelector('small').textContent = `${section.element.querySelectorAll('.file-row').length} files`;
    row.querySelector('.remove-button').addEventListener('click', () => removeSection(index));
    list.appendChild(row);
  });
  renderAdminFiles();
}

function renderAdminFiles() {
  const list = document.querySelector('#adminFileList');
  if (!list) return;
  list.innerHTML = '';
  const files = sections.flatMap((section) => [...section.element.querySelectorAll('.file-row')].map((row) => ({ row, section })));
  if (!files.length) {
    list.innerHTML = '<div class="empty-state">No files uploaded yet.</div>';
    return;
  }
  files.forEach(({ row, section }) => {
    const item = document.createElement('div');
    item.className = 'admin-file-row';
    item.innerHTML = '<span class="file-type doc"></span><div><strong></strong><small></small></div><button type="button" class="remove-file-button">Remove</button>';
    item.querySelector('.file-type').textContent = row.dataset.extension;
    item.querySelector('strong').textContent = row.dataset.name;
    item.querySelector('small').textContent = `${section.name} · ${row.dataset.size}`;
    item.querySelector('.remove-file-button').addEventListener('click', () => {
      supabaseClient.from('files').delete().eq('storage_path', row.dataset.storagePath).then(({ error }) => {
        if (error) console.error('Could not remove file from Supabase:', error.message);
      });
      if (row.dataset.storagePath) supabaseClient.storage.from('xplane-files').remove([row.dataset.storagePath]);
      row.remove();
      section.element.querySelector('.file-total').textContent = `${section.element.querySelectorAll('.file-row').length} files`;
      persistFiles();
      renderSectionEditor();
      showToast(`${row.dataset.name} removed`);
    });
    list.appendChild(item);
  });
}

function setupSectionEditor() {
  if (document.querySelector('#sectionEditor')) return;
  const editor = document.createElement('form');
  editor.className = 'section-editor';
  editor.id = 'sectionEditor';
  editor.innerHTML = '<div class="admin-section-title"><h4>Sections</h4><span>Add or remove file sections</span></div><div id="sectionList"></div><div class="section-add"><input class="access-input" id="sectionName" type="text" placeholder="New section name" required /><button class="access-submit" type="submit">Add section <span>+</span></button></div><div class="admin-file-editor"><div class="admin-section-title"><h4>Uploaded files</h4><span>Files already added</span></div><div id="adminFileList"></div></div>';
  const dashboardTop = adminDashboard.querySelector('.dashboard-top');
  dashboardTop.after(editor);
  const uploadForm = document.querySelector('#uploadForm');
  uploadForm.querySelector('.admin-section-title span').textContent = 'Choose a section';
  const sectionSelect = document.createElement('select');
  sectionSelect.className = 'access-input section-select';
  sectionSelect.id = 'uploadSection';
  uploadForm.querySelector('.upload-drop').before(sectionSelect);
  const filePassword = document.createElement('input');
  filePassword.className = 'access-input file-password-input';
  filePassword.id = 'uploadPassword';
  filePassword.type = 'password';
  filePassword.placeholder = 'Enter Anything';
  filePassword.required = true;
  uploadForm.querySelector('.upload-drop').before(filePassword);
  editor.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector('#sectionName');
    const name = input.value.trim();
    if (!name || sections.some((section) => section.name.toLowerCase() === name.toLowerCase())) return;
    createSection(name);
    persistSections();
    renderSectionEditor();
    input.value = '';
    showToast(`${name} added`);
  });
  renderSectionEditor();
  refreshSectionChoices();
}

function persistAccessLists() {
  localStorage.setItem('xplaneApprovedUsers', JSON.stringify(approvedUsers));
  localStorage.setItem('xplanePendingRequests', JSON.stringify(pendingRequests));
  Promise.all([
    supabaseClient.from('approved_users').upsert(approvedUsers.map((user) => ({ username: user.username, name: user.name, password: user.password })), { onConflict: 'username' }),
    supabaseClient.from('pending_requests').upsert(pendingRequests.map((request) => ({ username: request.username, name: request.name })), { onConflict: 'username' })
  ]).then(([approvedResult, pendingResult]) => {
    if (approvedResult.error || pendingResult.error) console.error('Could not save access lists to Supabase:', approvedResult.error?.message || pendingResult.error?.message);
  });
  window.dispatchEvent(new CustomEvent('xplane-data-updated'));
}

function showAccessError(message) {
  accessError.textContent = message;
  accessError.classList.add('show');
}

requestAccess.addEventListener('click', () => {
  requestMode = !requestMode;
  accessTitle.textContent = requestMode ? 'Request an invite.' : 'Welcome back.';
  accessCopy.textContent = requestMode ? 'Send your username to the admin to request access.' : 'This room is invite-only. Sign in with your approved username and password to continue.';
  accessSubmit.innerHTML = requestMode ? 'Send access request <span>→</span>' : 'Enter the room <span>→</span>';
  requestAccess.textContent = requestMode ? 'Already approved? Sign in instead' : 'Need access? Request an invite';
  accessUsernameLabel.textContent = requestMode ? 'Create a username' : 'Username';
  accessUsername.placeholder = requestMode ? 'Create a username' : 'Username';
  accessPassword.required = !requestMode;
  accessPasswordLabel?.classList.toggle('hidden', requestMode);
  accessPassword.classList.toggle('hidden', requestMode);
  accessError.classList.remove('show');
});

accessForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = accessUsername.value.trim().toLowerCase();
  if (requestMode) {
    const usernameExists = pendingRequests.some((request) => request.username === username) || approvedUsers.some((user) => user.username === username);
    if (usernameExists) {
      showAccessError('That username is already in use. Choose another one.');
      return;
    }
    pendingRequests.push({ username, name: username.replace(/[._-]/g, ' ') });
    persistAccessLists();
    accessTitle.textContent = 'Request received.';
    accessCopy.textContent = 'The admin will review your request and set your password. Return here after approval to enter the files.';
    accessForm.hidden = true;
    requestAccess.hidden = true;
    showAccessError('Pending admin approval · your request is safely queued.');
    return;
  }
  const user = approvedUsers.find((person) => person.username === username);
  if (!user) {
    showAccessError('Your account has not been approved by the admin yet.');
    return;
  }
  if (accessPassword.value !== user.password) {
    showAccessError('That password is not quite right.');
    return;
  }
  currentUser = user;
  accessScreen.classList.add('hidden');
});

function showAccessScreen(message = '') {
  currentUser = null;
  requestMode = false;
  accessForm.reset();
  accessForm.hidden = false;
  requestAccess.hidden = false;
  accessTitle.textContent = 'Welcome back.';
  accessCopy.textContent = 'This room is invite-only. Sign in with your approved username and password to continue.';
  accessSubmit.innerHTML = 'Enter the room <span>→</span>';
  requestAccess.textContent = 'Need access? Request an invite';
  accessUsernameLabel.textContent = 'Username';
  accessUsername.placeholder = 'Username';
  accessPassword.required = true;
  accessPasswordLabel?.classList.remove('hidden');
  accessPassword.classList.remove('hidden');
  accessError.classList.remove('show');
  accessScreen.classList.remove('hidden');
  if (message) showAccessError(message);
}

document.querySelector('#signOutButton').addEventListener('click', () => showAccessScreen());
document.querySelector('#deleteAccountButton').addEventListener('click', () => {
  if (!currentUser || !window.confirm('Delete your account and remove your access?')) return;
  const userIndex = approvedUsers.findIndex((user) => user.username === currentUser.username);
  if (userIndex !== -1) {
    approvedUsers.splice(userIndex, 1);
    supabaseClient.from('approved_users').delete().eq('username', currentUser.username);
    persistAccessLists();
  }
  showAccessScreen('Your account has been deleted.');
});

document.querySelectorAll('.download-button').forEach((button) => button.addEventListener('click', () => startDownload(button.closest('.file-row'))));

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

document.querySelector('#closeModal').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeModal(); closeAdminPanel(); } });
document.querySelector('#togglePassword').addEventListener('click', () => {
  passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
});

passwordForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!activeDownload || passwordInput.value !== activeDownload.dataset.password) {
    errorMessage.classList.add('show');
    passwordInput.focus();
    return;
  }
  closeModal();
  downloadFile(activeDownload);
  activeDownload = null;
  toast.innerHTML = `Download started <span>✓</span>`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
});

document.querySelector('#searchInput').addEventListener('input', (event) => {
  const query = event.target.value.toLowerCase().trim();
  document.querySelectorAll('.collection-section').forEach((section) => {
    let visibleFiles = 0;
    section.querySelectorAll('.file-row').forEach((row) => {
      const matches = row.dataset.name.toLowerCase().includes(query);
      row.hidden = !matches;
      if (matches) visibleFiles += 1;
    });
    section.hidden = visibleFiles === 0;
  });
});

document.querySelector('#filterButton').addEventListener('click', (event) => {
  const button = event.currentTarget;
  button.dataset.reverse = button.dataset.reverse !== 'true';
  button.querySelector('span').textContent = button.dataset.reverse === 'true' ? 'Oldest first' : 'Newest first';
});

function closeAdminPanel() {
  adminPanel.classList.remove('open');
  adminPanel.setAttribute('aria-hidden', 'true');
}

document.querySelector('#adminEntry').addEventListener('click', () => {
  adminPanel.classList.add('open');
  adminPanel.setAttribute('aria-hidden', 'false');
});
document.querySelector('#adminLoginLink').addEventListener('click', () => {
  adminPanel.classList.add('open');
  adminPanel.setAttribute('aria-hidden', 'false');
});
document.querySelector('#closeAdmin').addEventListener('click', closeAdminPanel);
adminPanel.addEventListener('click', (event) => { if (event.target === adminPanel) closeAdminPanel(); });

document.querySelector('#adminForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.querySelector('#adminEmail').value.trim().toLowerCase();
  const password = document.querySelector('#adminPassword').value;
  const adminError = document.querySelector('#adminError');
  if (username !== adminCredentials.username || password !== adminCredentials.password) {
    adminError.textContent = 'Admin credentials are not correct.';
    adminError.classList.add('show');
    return;
  }
  adminLoginView.hidden = true;
  adminDashboard.hidden = false;
  setupSectionEditor();
  renderRequests();
  renderPeople();
});

function refreshAdminDashboard() {
  if (adminDashboard.hidden) return;
  renderRequests();
  renderPeople();
  renderSectionEditor();
  refreshSectionChoices();
}

window.addEventListener('xplane-data-updated', refreshAdminDashboard);
window.addEventListener('storage', refreshAdminDashboard);

function renderRequests() {
  const requestList = document.querySelector('#requestList');
  const requestCount = document.querySelector('#requestCount');
  requestCount.textContent = `${pendingRequests.length} waiting`;
  requestList.innerHTML = '';
  if (!pendingRequests.length) {
    requestList.innerHTML = '<div class="empty-state">No pending requests.</div>';
    return;
  }
  pendingRequests.forEach((request, index) => {
    const card = document.createElement('div');
    card.className = 'request-card';
    card.innerHTML = `<div class="avatar">${request.name.slice(0, 2).toUpperCase()}</div><div class="request-person"><strong>${request.name}</strong><small>${request.username}</small></div><input class="request-password" type="password" placeholder="Set password" aria-label="Set password for ${request.username}" /><button class="approve-button" type="button" data-request-index="${index}">Approve</button><button class="deny-button" type="button" data-request-index="${index}">Deny</button>`;
    requestList.appendChild(card);
  });
  requestList.querySelectorAll('.approve-button').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.request-card');
      const password = card.querySelector('.request-password').value;
      if (!password) {
        showToast('Set a password before approving');
        return;
      }
      const requestIndex = Number(button.dataset.requestIndex);
      const approved = pendingRequests[requestIndex];
      if (approvedUsers.some((user) => user.username === approved.username)) {
        showToast('That username already exists');
        renderRequests();
        return;
      }
      pendingRequests.splice(requestIndex, 1);
      approvedUsers.push({ username: approved.username, name: approved.name, password });
      persistAccessLists();
      renderRequests();
      renderPeople();
      showToast(`${approved.name} approved`);
    });
  });
  requestList.querySelectorAll('.deny-button').forEach((button) => {
    button.addEventListener('click', () => {
      const requestIndex = Number(button.dataset.requestIndex);
      const [denied] = pendingRequests.splice(requestIndex, 1);
      supabaseClient.from('pending_requests').delete().eq('username', denied.username);
      persistAccessLists();
      renderRequests();
      showToast(`${denied.name} denied`);
    });
  });
}

function renderPeople() {
  const peopleList = document.querySelector('#peopleList');
  document.querySelector('#peopleCount').textContent = `${approvedUsers.length} people`;
  peopleList.innerHTML = '';
  if (!approvedUsers.length) {
    peopleList.innerHTML = '<div class="empty-state">No approved people yet.</div>';
    return;
  }
  approvedUsers.forEach((user, index) => {
    const card = document.createElement('div');
    card.className = 'request-card';
    card.innerHTML = `<div class="avatar">${user.username.slice(0, 2).toUpperCase()}</div><div class="request-person"><strong>${user.name || user.username}</strong><small>${user.username}</small></div><button class="remove-button" type="button" data-person-index="${index}">Remove</button>`;
    peopleList.appendChild(card);
  });
  peopleList.querySelectorAll('.remove-button').forEach((button) => button.addEventListener('click', () => {
    const [removed] = approvedUsers.splice(Number(button.dataset.personIndex), 1);
    supabaseClient.from('approved_users').delete().eq('username', removed.username);
    persistAccessLists();
    renderPeople();
    showToast('Person removed');
  }));
}

document.querySelector('#addPersonForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const usernameInput = document.querySelector('#personEmail');
  const nameInput = document.querySelector('#personName');
  const passwordInput = document.querySelector('#personPassword') || createPersonPasswordInput();
  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  if (!password) {
    showToast('Set a password for this person');
    return;
  }
  if (!approvedUsers.some((user) => user.username === username)) {
    approvedUsers.push({ username, name: nameInput.value.trim() || username, password });
    persistAccessLists();
    renderPeople();
    showToast(`${nameInput.value.trim() || username} can now enter`);
  } else {
    showToast('That username already exists');
  }
  event.currentTarget.reset();
});

function createPersonPasswordInput() {
  const input = document.createElement('input');
  input.className = 'access-input';
  input.id = 'personPassword';
  input.type = 'password';
  input.placeholder = 'Set password';
  input.required = true;
  document.querySelector('.person-fields').appendChild(input);
  return input;
}

if (!document.querySelector('#personPassword')) createPersonPasswordInput();

document.querySelector('#adminSignout').addEventListener('click', () => {
  adminLoginView.hidden = false;
  adminDashboard.hidden = true;
  document.querySelector('#adminForm').reset();
});

document.querySelector('#uploadForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = document.querySelector('#fileInput').files[0];
  const section = sections.find((item) => item.id === document.querySelector('#uploadSection')?.value);
  const filePassword = document.querySelector('#uploadPassword')?.value;
  if (!file || !section || !filePassword) {
    showToast(!section ? 'Add a section first' : !file ? 'Choose a file first' : 'Set a password for this file');
    return;
  }
  const extension = file.name.split('.').pop().slice(0, 4).toUpperCase();
  const size = file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  const storagePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  const { error: uploadError } = await supabaseClient.storage.from('xplane-files').upload(storagePath, file, { upsert: false });
  if (uploadError) {
    showToast(`Upload failed: ${uploadError.message}`);
    return;
  }
  appendFileToSection(section, { name: file.name, size, password: filePassword, extension, blob: file, storagePath });
  persistFiles();
  document.querySelector('#uploadForm').reset();
  renderSectionEditor();
  showToast(`${file.name} added to ${section.name}`);
});

function showToast(message) {
  toast.innerHTML = `${message} <span>✓</span>`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

async function loadCloudData() {
  const [sectionResult, fileResult, userResult, requestResult] = await Promise.all([
    supabaseClient.from('sections').select('id, name').order('created_at'),
    supabaseClient.from('files').select('name, size, password, extension, storage_path, section_id').order('created_at'),
    supabaseClient.from('approved_users').select('username, name, password').order('created_at'),
    supabaseClient.from('pending_requests').select('username, name').order('created_at')
  ]);
  const firstError = sectionResult.error || fileResult.error || userResult.error || requestResult.error;
  if (firstError) {
    console.warn('Supabase is not ready yet. Using local data:', firstError.message);
    return;
  }
  if (!sectionResult.data.length && !fileResult.data.length && !userResult.data.length && !requestResult.data.length) return;

  sections.forEach((section) => { section.element.remove(); section.navLink.remove(); });
  sections.length = 0;
  approvedUsers.splice(0, approvedUsers.length, ...userResult.data);
  pendingRequests.splice(0, pendingRequests.length, ...requestResult.data);
  sectionResult.data.forEach((section) => createSection(section.name));
  fileResult.data.forEach((file) => {
    const section = sections.find((item) => item.name === sectionResult.data.find((saved) => saved.id === file.section_id)?.name);
    if (section) appendFileToSection(section, { name: file.name, size: file.size, password: file.password, extension: file.extension, storagePath: file.storage_path });
  });
  emptyFiles.hidden = sections.length > 0;
  window.dispatchEvent(new CustomEvent('xplane-data-updated'));
}

loadCloudData();
