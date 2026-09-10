const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const categories={Tanulás:{icon:'📚',asset:'assets/qubi-mascot.png'},Otthon:{icon:'🏠',asset:'assets/qubi-home.png'},Munka:{icon:'💼',asset:'assets/qubi-work.png'},Saját:{icon:'🌱',asset:'assets/qubi-personal.png'}};
let tasks=[],filter='all',user=null,pendingDelete=null,syncTimer=null,editingTaskId=null,currentTaskImage=null;

const getLang=()=>user?.language||localStorage.getItem('qubi-lang')||(navigator.language?.startsWith('uk')?'uk':navigator.language?.startsWith('en')?'en':'hu');

const uiText={
 hu:{today:'Ma',calendar:'Naptár',stats:'Haladás',profile:'Profil',add:'Új küldetés',save:'Módosítások mentése',invite:'💌 Barát meghívása',logout:'Kijelentkezés',saved:'Profil mentve',inviteText:'Próbáld ki te is a Qubit, az offline is működő feladatkezelőt!',copied:'A meghívó linket kimásoltuk.',hello:'Szia',locale:'hu-HU',category_Tanulás:'Tanulás',category_Otthon:'Otthon',category_Munka:'Munka',category_Saját:'Saját'},
 en:{today:'Today',calendar:'Calendar',stats:'Progress',profile:'Profile',add:'New mission',save:'Save changes',invite:'💌 Invite a friend',logout:'Sign out',saved:'Profile saved',inviteText:'Try Qubi, the task manager that also works offline!',copied:'Invite link copied.',hello:'Hi',locale:'en-US',category_Tanulás:'Learning',category_Otthon:'Home',category_Munka:'Work',category_Saját:'Personal'},
 uk:{today:'Сьогодні',calendar:'Календар',stats:'Прогрес',profile:'Профіль',add:'Нове завдання',save:'Зберегти зміни',invite:'💌 Запросити друга',logout:'Вийти',saved:'Профіль збережено',inviteText:'Спробуйте Qubi — менеджер завдань, який працює офлайн!',copied:'Посилання для запрошення скопійовано.',hello:'Привіт',locale:'uk-UA',category_Tanulás:'Навчання',category_Otthon:'Дім',category_Munka:'Робота',category_Saját:'Особисте'}
};

const staticText={
 en:{
  'A SAJÁT KÜLDETÉSEID':'YOUR MISSIONS','Örülök, hogy itt vagy!':'Great to see you!','Feladataid offline is veled maradnak, és internetnél automatikusan szinkronizálódnak.':'Your tasks stay with you offline and sync automatically when you are online.','Belépés':'Sign in','Regisztráció':'Create account','Email-cím':'Email address','Jelszó':'Password','Elfelejtettem a jelszavam':'Forgot password','Neved':'Your name','Legalább 8 karakter':'At least 8 characters','Fiók létrehozása':'Create account','vagy':'or','Folytatás Google-fiókkal':'Continue with Google','Főmenü':'Main menu','Szinkronizálás…':'Syncing…','A feladatok biztonságban vannak':'Your tasks are safe','Szia,':'Hi,','Offline módban vagy – a változtatásokat később szinkronizáljuk.':'You are offline — changes will sync later.','KÖVETKEZŐ KÜLDETÉS':'NEXT MISSION','Kezdjük el a napot!':'Let’s start the day!','Qubi készen áll veled.':'Qubi is ready for you.','MAI TERV':'TODAY’S PLAN','Mai küldetéseid':'Today’s missions','Napi haladás':'Daily progress','Mind':'All','Tanulás':'Learning','Otthon':'Home','Munka':'Work','Saját':'Personal','QUBI-PONTOK':'QUBI POINTS','Csak így tovább!':'Keep it up!','Minden teljesített küldetés +20 pont.':'Every completed mission gives +20 points.','TERÜLETEK':'AREAS','Kategóriák':'Categories','Következő napok':'Coming days','Nincs sürgős határidőd.':'No urgent deadlines.','ÁTTEKINTÉS':'OVERVIEW','Naptár':'Calendar','EREDMÉNYEK':'RESULTS','kész küldetés':'completed missions','Qubi-pont':'Qubi points','aktív feladat':'active missions','SAJÁT TÉR':'PERSONAL SPACE','Profil':'Profile','Teljes név':'Full name','Hogyan szólíthatunk?':'What should we call you?','Nyelv':'Language','Emlékeztető hang':'Reminder sound','Rendszerhang':'System sound','Qubi csilingelés':'Qubi chime','Vidám jelzés':'Bright alert','Saját feltöltött hang':'Uploaded sound','Saját hang feltöltése':'Upload your own sound','A saját hang akkor szólal meg, amikor a Qubi nyitva van. Háttérben a telefon rendszerhangja működik.':'Your sound plays while Qubi is open. In the background, your phone’s system sound is used.','ÚJ BEJEGYZÉS':'NEW ENTRY','Új küldetés':'New mission','Mi legyen a küldetés?':'What is the mission?','Kezdőnap':'Start date','Időpont':'Time','Ismétlődés':'Repeat','Nem ismétlődik':'Does not repeat','Naponta':'Daily','Hetente, kiválasztott napokon':'Weekly, selected days','Minden hónap adott napján':'Monthly on a day','Évente':'Yearly','Mely napokon?':'Which days?','Ismétlődés vége':'Repeat until','Emlékeztessen 10 perccel előtte':'Remind me 10 minutes before','Küldetés hozzáadása':'Add mission','Új jelszó kérése':'Request new password','Elküldjük a biztonságos visszaállító linket.':'We will send a secure reset link.','Link küldése':'Send link','Új jelszó beállítása':'Set new password','Jelszó mentése':'Save password','Feladat törlése?':'Delete mission?','Az eltávolítás minden eszközön szinkronizálódik.':'Removal syncs to all devices.','Mégse':'Cancel','Törlés':'Delete','Leírás':'Description','Részletek, megjegyzések...':'Details, notes...',
  'Bejelentkezés szükséges.':'Login required.','Adj meg érvényes nevet, email-címet és legalább 8 karakteres jelszót.':'Please provide a valid name, email address, and password of at least 8 characters.','A belépés nem sikerült.':'Login failed.','Ehhez az email-címhez már tartozik fiók.':'An account with this email address already exists.','Hibás email-cím vagy jelszó.':'Incorrect email address or password.','Ha létezik ilyen fiók, elküldtük a visszaállító linket.':'If such an account exists, we sent the reset link.','A jelszó legalább 8 karakter legyen.':'Password must be at least 8 characters.','A link érvénytelen vagy lejárt.':'The link is invalid or expired.','Érvénytelen profiladatok.':'Invalid profile data.','Érvénytelen vagy üres hangfájl.':'Invalid or empty sound file.','Váratlan szerverhiba történt.':'An unexpected server error occurred.'
 },
 uk:{
  'A SAJÁT KÜLDETÉSEID':'ВАШІ ЗАВДАННЯ','Örülök, hogy itt vagy!':'Раді вас бачити!','Feladataid offline is veled maradnak, és internetnél automatikusan szinkronizálódnak.':'Ваші завдання доступні офлайн і автоматично синхронізуються з інтернетом.','Belépés':'Увійти','Regisztráció':'Реєстрація','Email-cím':'Електронна пошта','Jelszó':'Пароль','Elfelejtettem a jelszavam':'Забув пароль','Neved':'Ваше ім’я','Legalább 8 karakter':'Щонайменше 8 символів','Fiók létrehozása':'Створити обліковий запис','vagy':'або','Folytatás Google-fiókkal':'Продовжити з Google','Főmenü':'Головне меню','Szinkronizálás…':'Синхронізація…','A feladatok biztonságban vannak':'Ваші завдання захищені','Szia,':'Привіт,','Offline módban vagy – a változtatásokat később szinkronizáljuk.':'Ви офлайн — зміни синхронізуються пізніше.','KÖVETKEZŐ KÜLDETÉS':'НАСТУПНЕ ЗАВДАННЯ','Kezdjük el a napot!':'Почнімо день!','Qubi készen áll veled.':'Qubi готовий допомогти.','MAI TERV':'ПЛАН НА СЬОГОДНІ','Mai küldetéseid':'Завдання на сьогодні','Napi haladás':'Прогрес за день','Mind':'Усі','Tanulás':'Навчання','Otthon':'Дім','Munka':'Робота','Saját':'Особисте','QUBI-PONTOK':'БАЛИ QUBI','Csak így tovább!':'Так тримати!','Minden teljesített küldetés +20 pont.':'За кожне виконане завдання +20 балів.','TERÜLETEK':'СФЕРИ','Kategóriák':'Категорії','Következő napok':'Найближчі дні','Nincs sürgős határidőd.':'Немає термінових дедлайнів.','ÁTTEKINTÉS':'ОГЛЯД','Naptár':'Календар','EREDMÉNYEK':'РЕЗУЛЬТАТИ','kész küldetés':'виконаних завдань','Qubi-pont':'балів Qubi','aktív feladat':'активних завдань','SAJÁT TÉR':'ОСОБИСТИЙ ПРОСТІР','Profil':'Профіль','Teljes név':'Повне ім’я','Hogyan szólíthatunk?':'Як до вас звертатися?','Nyelv':'Мова','Emlékeztető hang':'Звук нагадування','Rendszerhang':'Системний звук','Qubi csilingelés':'Дзвін Qubi','Vidám jelzés':'Веселий сигнал','Saját feltöltött hang':'Завантажений звук','Saját hang feltöltése':'Завантажити власний звук','A saját hang akkor szólal meg, amikor a Qubi nyitva van. Háttérben a telefon rendszerhangja működik.':'Ваш звук працює, коли Qubi відкритий. У фоні використовується системний звук телефона.','ÚJ BEJEGYZÉS':'НОВИЙ ЗАПИС','Új küldetés':'Нове завдання','Mi legyen a küldetés?':'Яке завдання?','Kezdőnap':'Дата початку','Időpont':'Час','Ismétlődés':'Повторення','Nem ismétlődik':'Без повторення','Naponta':'Щодня','Hetente, kiválasztott napokon':'Щотижня, у вибрані дні','Minden hónap adott napján':'Щомісяця у вибраний день','Évente':'Щороку','Mely napokon?':'У які дні?','Ismétlődés vége':'Кінець повторення','Emlékeztessen 10 perccel előtte':'Нагадати за 10 хвилин','Küldetés hozzáadása':'Додати завдання','Új jelszó kérése':'Запит нового пароля','Elküldjük a biztonságos visszaállító linket.':'Надішлемо безпечне посилання для відновлення.','Link küldése':'Надіслати посилання','Új jelszó beállítása':'Встановити новий пароль','Jelszó mentése':'Зберегти пароль','Feladat törlése?':'Видалити завдання?','Az eltávolítás minden eszközön szinkronizálódik.':'Видалення синхронізується на всіх пристроях.','Mégse':'Скасувати','Törlés':'Видалити','Leírás':'Опис','Részletek, megjegyzések...':'Деталі, примітки...',
  'Bejelentkezés szükséges.':'Потрібна авторизація.','Adj meg érvényes nevet, email-címet és legalább 8 karakteres jelszót.':'Вкажіть коректне ім’я, email та пароль щонайменше з 8 символів.','A belépés nem sikerült.':'Невдала спроба входу.','Ehhez az email-címhez már tartozik fiók.':'Акаунт з цією адресою вже існує.','Hibás email-cím vagy jelszó.':'Невірний email або пароль.','Ha létezik ilyen fiók, elküldtük a visszaállító linket.':'Якщо такий акаунт існує, посилання надіслано.','A jelszó legalább 8 karakter legyen.':'Пароль має бути щонайменше 8 символів.','A link érvénytelen vagy lejárt.':'Посилання недійсне або застаріло.','Érvénytelen vagy üres hangfájl.':'Недійсний або порожній аудіофайл.','Váratlan szerverhiba történt.':'Сталася несподівана помилка сервера.'
 }
};

const dynText={
 hu:{offline:'Offline mód',offlineDetail:'A módosításokat ezen az eszközön mentjük',syncing:'Szinkronizálás…',synced:'Szinkronban',savedLocal:'Helyben mentve',retry:'Újrapróbáljuk, ha van internet',allDone:'Itt most minden kész.',addHint:'Adj hozzá egy új küldetést!',active:'aktív',upcoming:'Nincs sürgős határidőd.',allDoneHero:'Minden kész mára!',proud:'Qubi büszke rád.',next:'KÖVETKEZŐ KÜLDETÉS',great:'SZÉP MUNKA',repeatDaily:'Naponta',repeatWeekly:'Hetente',repeatMonthly:'Havonta',repeatYearly:'Évente',noTime:'Nincs időpont',today:'Ma',completed:'Szép munka! +20 Qubi-pont ✦',deleted:'Küldetés törölve',restoreTask:'Feladat visszaállítása',completeTask:'Feladat teljesítése',deleteSeries:'Teljes feladatsorozat törlése',doneStatus:'kész',noUpcoming:'Nincs közelgő feladat.',selectOneDay:'Válassz legalább egy napot!',recurringAdded:'Ismétlődő küldetés hozzáadva ↻',newAdded:'Új küldetés hozzáadva ✦',missionUpdated:'Küldetés frissítve ✦',pushFailed:'A háttérértesítés engedélyezése nem sikerült.',soundFileLimit:'A hangfájl legfeljebb 1 MB lehet.',soundUploadFailed:'A hang feltöltése nem sikerült.',shareFailed:'A megosztás nem sikerült.',googleAuthFailed:'A Google-belépés nem sikerült.',googleAuthNotConfigured:'A Google-belépés még nincs konfigurálva.',passwordChanged:'A jelszavad megváltozott. Most már beléphetsz.',editMission:'Küldetés szerkesztése',newMission:'Új küldetés',saveChanges:'Mentés',addMissionBtn:'Küldetés hozzáadása',editEntry:'BEJEGYZÉS MÓDOSÍTÁSA',newEntry:'ÚJ BEJEGYZÉS',attachPhoto:'📷 Kamera / Fotó csatolása',days:['H','K','Sze','Cs','P','Szo','V']},
 en:{offline:'Offline mode',offlineDetail:'Changes are saved on this device',syncing:'Syncing…',synced:'Synced',savedLocal:'Saved locally',retry:'We will retry when online',allDone:'Everything is done for now.',addHint:'Add a new mission!',active:'active',upcoming:'No urgent deadlines.',allDoneHero:'All done for today!',proud:'Qubi is proud of you.',next:'NEXT MISSION',great:'GREAT WORK',repeatDaily:'Daily',repeatWeekly:'Weekly',repeatMonthly:'Monthly',repeatYearly:'Yearly',noTime:'No time set',today:'Today',completed:'Great work! +20 Qubi points ✦',deleted:'Mission deleted',restoreTask:'Restore mission',completeTask:'Complete mission',deleteSeries:'Delete entire series',doneStatus:'done',noUpcoming:'No upcoming missions.',selectOneDay:'Select at least one day!',recurringAdded:'Recurring mission added ↻',newAdded:'New mission added ✦',missionUpdated:'Mission updated ✦',pushFailed:'Background notifications could not be enabled.',soundFileLimit:'Sound file must be at most 1 MB.',soundUploadFailed:'Sound upload failed.',shareFailed:'Sharing failed.',googleAuthFailed:'Google login failed.',googleAuthNotConfigured:'Google login is not configured yet.',passwordChanged:'Your password has been changed. You can log in now.',editMission:'Edit mission',newMission:'New mission',saveChanges:'Save changes',addMissionBtn:'Add mission',editEntry:'EDIT ENTRY',newEntry:'NEW ENTRY',attachPhoto:'📷 Attach photo / camera image',days:['Mon','Tue','Wed','Thu','Fri','Sat','Sun']},
 uk:{offline:'Офлайн-режим',offlineDetail:'Зміни збережено на цьому пристрої',syncing:'Синхронізація…',synced:'Синхронізовано',savedLocal:'Збережено локально',retry:'Повторимо, коли з’явиться інтернет',allDone:'Усі завдання виконано.',addHint:'Додайте нове завдання!',active:'активних',upcoming:'Немає термінових дедлайнів.',allDoneHero:'Усе виконано на сьогодні!',proud:'Qubi пишається вами.',next:'НАСТУПНЕ ЗАВДАННЯ',great:'ЧУДОВА РОБОТА',repeatDaily:'Щодня',repeatWeekly:'Щотижня',repeatMonthly:'Щомісяця',repeatYearly:'Щороку',noTime:'Час не задано',today:'Сьогодні',completed:'Чудова робота! +20 балів Qubi ✦',deleted:'Завдання видалено',restoreTask:'Відновити завдання',completeTask:'Виконати завдання',deleteSeries:'Видалити всю серію',doneStatus:'виконано',noUpcoming:'Немає майбутніх завдань.',selectOneDay:'Виберіть хоча б один день!',recurringAdded:'Повторюване завдання додано ↻',newAdded:'Нове завдання додано ✦',missionUpdated:'Завдання оновлено ✦',pushFailed:'Не вдалося увімкнути сповіщення.',soundFileLimit:'Аудіофайл має бути не більше 1 МБ.',soundUploadFailed:'Не вдалося завантажити звук.',shareFailed:'Не вдалося поділитися.',googleAuthFailed:'Вхід через Google не вдався.',googleAuthNotConfigured:'Вхід через Google ще не налаштовано.',passwordChanged:'Ваш пароль змінено. Тепер ви можете увійти.',editMission:'Редагувати завдання',newMission:'Нове завдання',saveChanges:'Зберегти зміни',addMissionBtn:'Додати завдання',editEntry:'РЕДАГУВАННЯ ЗАПИСУ',newEntry:'НОВИЙ ЗАПИС',attachPhoto:'📷 Додати фото з камери',days:['Пн','Вт','Ср','Чт','Пт','Сб','Нд']}
};

const t=key=>(uiText[getLang()]||uiText.hu)[key]||key;
const d=key=>(dynText[getLang()]||dynText.hu)[key]||key;
const trMsg=msg=>{if(!msg)return '';const lang=getLang();if(lang==='hu')return msg;return staticText[lang]?.[msg]||dynText[lang]?.[msg]||msg;};

function compressImage(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=e=>{
   const img=new Image();
   img.onload=()=>{
    const canvas=document.createElement('canvas');
    let w=img.width,h=img.height,max=800;
    if(w>max||h>max){
     if(w>h){h=Math.round(h*(max/w));w=max;}
     else{w=Math.round(w*(max/h));h=max;}
    }
    canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(img,0,0,w,h);
    resolve(canvas.toDataURL('image/jpeg',0.7));
   };
   img.onerror=reject;
   img.src=e.target.result;
  };
  reader.onerror=reject;
  reader.readAsDataURL(file);
 });
}

function translateStatic(){
 const lang=getLang(); document.documentElement.lang=lang;
 const dict=staticText[lang]||{};
 const walk=node=>{
  if(node.nodeType===Node.ELEMENT_NODE && (node.id==='screenDebugInfo' || node.hasAttribute('data-no-translate'))) return;
  if(node.nodeType===Node.TEXT_NODE){const raw=node.nodeValue,trimmed=raw.trim();if(dict[trimmed])node.nodeValue=raw.replace(trimmed,dict[trimmed]);return}
  node.childNodes?.forEach(walk)
 };
 walk(document.body);
 $$('input,textarea').forEach(el=>{const key=el.getAttribute('placeholder');if(key&&dict[key])el.setAttribute('placeholder',dict[key])});
 $$('[aria-label]').forEach(el=>{const key=el.getAttribute('aria-label');if(dict[key])el.setAttribute('aria-label',dict[key])});
}

const todayKey=()=>new Date().toLocaleDateString('sv-SE');
const escapeHtml=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const toast=message=>{const el=$('#toast');el.textContent=trMsg(message);el.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('show'),2400)};
function setAvatar(element, profile){
 const fallback=(profile?.preferredName||profile?.displayName||'?').trim().charAt(0).toUpperCase()||'?';
 element.replaceChildren();
 if(profile?.avatarUrl){
  const image=document.createElement('img'); image.src=profile.avatarUrl; image.alt=profile.displayName||'Profilkép'; image.referrerPolicy='no-referrer';
  image.onerror=()=>{element.textContent=fallback}; element.append(image);
 } else element.textContent=fallback;
}
function applyLanguage(){
 const lang=getLang(); document.documentElement.lang=lang; translateStatic();
 const labels={today:t('today'),calendar:t('calendar'),stats:t('stats'),profile:t('profile')};
 $$('.nav-item[data-view]').forEach(button=>{const small=button.querySelector('small');if(small)small.textContent=labels[button.dataset.view];else{const span=button.querySelector('span');button.replaceChildren(span,document.createTextNode(` ${labels[button.dataset.view]}`))}});
 $('#addTaskBtn').lastChild.textContent=` ${t('add')}`;$('#profileForm button').textContent=t('save');$('#inviteFriendBtn').textContent=t('invite');$('#logoutBtn').textContent=t('logout');
 if($('#uploadPhotoLabel'))$('#uploadPhotoLabel').textContent=d('attachPhoto');
}

function openDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open('qubi-offline',2);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('tasks'))db.createObjectStore('tasks',{keyPath:'key'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function localRead(){const db=await openDb();return new Promise((resolve,reject)=>{const request=db.transaction('tasks').objectStore('tasks').getAll();request.onsuccess=()=>resolve(request.result.filter(x=>x.userId===user.id).map(x=>x.task));request.onerror=()=>reject(request.error)})}
async function localWrite(items){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction('tasks','readwrite'),store=tx.objectStore('tasks');items.forEach(task=>store.put({key:`${user.id}:${task.id}`,userId:user.id,task}));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function localClearUser(){const db=await openDb(),all=await new Promise(r=>{const q=db.transaction('tasks').objectStore('tasks').getAllKeys();q.onsuccess=()=>r(q.result)});await new Promise(resolve=>{const tx=db.transaction('tasks','readwrite');all.filter(k=>String(k).startsWith(`${user.id}:`)).forEach(k=>tx.objectStore('tasks').delete(k));tx.oncomplete=resolve})}

async function api(url,options={}){const response=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(response.status===204)return null;const data=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(data.error||'A kérés nem sikerült.'),{status:response.status});return data}
function decodeKey(value){const padding='='.repeat((4-value.length%4)%4),raw=atob((value+padding).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)))}
async function enablePush(){if(!('serviceWorker'in navigator)||!('PushManager'in window))return false;const permission=await Notification.permission();if(permission!=='granted')return false;const registration=await navigator.serviceWorker.ready,key=await api('/api/push/key');if(!key.publicKey)return false;let subscription=await registration.pushManager.getSubscription();if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(key.publicKey)});await api('/api/push/subscribe',{method:'POST',body:JSON.stringify(subscription)});return true}
function playReminderSound(){const sound=user?.reminderSound||'gentle';if(sound==='default')return;const src=sound==='custom'?`/api/profile/sound?v=${Date.now()}`:`/assets/sound-${sound}.mp3`;new Audio(src).play().catch(()=>{})}
function setOnlineState(){const online=navigator.onLine;$('#offlineBanner').classList.toggle('hidden',online);$('#syncDot').classList.toggle('offline',!online);if(!online){$('#syncText').textContent=d('offline');$('#syncDetail').textContent=d('offlineDetail')}}
async function sync(){if(!user||!navigator.onLine)return;clearTimeout(syncTimer);$('#syncText').textContent=d('syncing');try{const data=await api('/api/sync',{method:'POST',body:JSON.stringify({changes:tasks})});tasks=data.tasks;await localClearUser();await localWrite(tasks);render();$('#syncText').textContent=d('synced');$('#syncDetail').textContent=`${new Date().toLocaleTimeString((uiText[getLang()]||uiText.hu).locale,{hour:'2-digit',minute:'2-digit'})}`;}catch(error){if(error.status===401)return showAuth();$('#syncText').textContent=d('savedLocal');$('#syncDetail').textContent=d('retry');}}
function queueSync(){localWrite(tasks);clearTimeout(syncTimer);syncTimer=setTimeout(sync,700)}

function dueDate(task){if(!task.dueAt)return null;const d=new Date(task.dueAt);return isNaN(d.getTime())?null:d}
function datePart(task){const d=dueDate(task);return d?d.toLocaleDateString('sv-SE'):''}
const keyToDate=key=>new Date(`${key}T12:00:00`);
function occursOn(task,key){const start=datePart(task);if(!start)return true;if(key<start)return false;const rule=task.recurrence;if(!rule)return key===start;if(rule.endDate&&key>rule.endDate)return false;const d=keyToDate(key),s=keyToDate(start);if(rule.frequency==='daily')return true;if(rule.frequency==='weekly')return (rule.weekdays||[]).includes(d.getDay());if(rule.frequency==='monthly')return d.getDate()===Number(rule.monthDay||s.getDate());if(rule.frequency==='yearly')return d.getMonth()===s.getMonth()&&d.getDate()===s.getDate();return false}

function occurrenceDate(task,key){const source=dueDate(task),d=keyToDate(key);if(source){d.setHours(source.getHours(),source.getMinutes(),0,0)}return d}
function isDone(task,key){return task.recurrence?(task.completedDates||[]).includes(key):Boolean(task.done)}
function nextOccurrence(task,fromKey=todayKey(),limit=370){for(let i=0;i<limit;i++){const d=keyToDate(fromKey);d.setDate(d.getDate()+i);const key=d.toLocaleDateString('sv-SE');if(occursOn(task,key)&&!isDone(task,key))return key}return null}
function recurrenceLabel(task){const r=task.recurrence;if(!r)return '';if(r.frequency==='daily')return d('repeatDaily');if(r.frequency==='weekly')return d('repeatWeekly');if(r.frequency==='monthly')return `${d('repeatMonthly')} ${r.monthDay}.`;return d('repeatYearly')}
function formatDue(task,key=datePart(task)){if(!key)return d('noTime');const date=occurrenceDate(task,key),day=key===todayKey()?d('today'):date.toLocaleDateString((uiText[getLang()]||uiText.hu).locale,{month:'short',day:'numeric'});const source=dueDate(task),hasTime=source&&typeof task.dueAt==='string'&&task.dueAt.includes('T');return `${day}${hasTime?`, ${date.toLocaleTimeString((uiText[getLang()]||uiText.hu).locale,{hour:'2-digit',minute:'2-digit'})}`:''}`}
function activeTasks(){return tasks.filter(t=>!t.deleted)}

function render(){
 const all=activeTasks(),key=todayKey(),today=all.filter(t=>occursOn(t,key)),shown=(filter==='all'?today:today.filter(t=>t.category===filter)).sort((a,b)=>occurrenceDate(a,key)-occurrenceDate(b,key));const done=today.filter(t=>isDone(t,key)).length,pct=today.length?done/today.length*100:0;
  $('#taskList').innerHTML=shown.length?shown.map(task=>{const complete=isDone(task,key);return `<article class="task ${complete?'done':''}" data-id="${task.id}" data-date="${key}"><button class="check" aria-label="${complete?d('restoreTask'):d('completeTask')}"></button><button class="task-body" aria-label="${escapeHtml(task.title)}"><span class="task-title">${escapeHtml(task.title)}</span>${task.description?`<p class="task-desc">${escapeHtml(task.description)}</p>`:''}<span class="task-meta"><b class="cat-${Object.keys(categories).indexOf(task.category)}">${categories[task.category]?.icon||'📌'} ${t(`category_${task.category}`)}</b><span>◷ ${formatDue(task,key)}</span>${task.reminderMinutes!=null?'<span>🔔</span>':''}${task.recurrence?`<span class="repeat-badge">↻ ${recurrenceLabel(task)}</span>`:''}</span></button>${task.image?`<img class="task-thumb" src="${task.image}" alt="Fotó">`:''}<button class="delete-task" aria-label="${d('deleteSeries')}">×</button></article>`}).join(''):`<div class="empty-state"><span>✨</span><strong>${d('allDone')}</strong><small>${d('addHint')}</small></div>`;
 $('#progressLabel').textContent=`${done} / ${today.length} ${d('doneStatus')}`;$('#progressBar').style.width=`${pct}%`;const completionCount=all.reduce((sum,t)=>sum+(t.recurrence?(t.completedDates||[]).length:(t.done?1:0)),0),score=completionCount*20;$('#scoreValue').textContent=score;$('#pointStat').textContent=score;$('#doneStat').textContent=completionCount;$('#activeStat').textContent=all.filter(t=>nextOccurrence(t)).length;
 $('#categoryGrid').innerHTML=Object.entries(categories).map(([c,v])=>`<button class="category" data-category="${c}"><span class="category-icon">${v.icon}</span><strong>${t(`category_${c}`)}</strong><small>${all.filter(t=>t.category===c&&nextOccurrence(t)).length} ${d('active')}</small></button>`).join('');
 const candidates=all.map(task=>({task,key:nextOccurrence(task)})).filter(x=>x.key).sort((a,b)=>occurrenceDate(a.task,a.key)-occurrenceDate(b.task,b.key)),next=candidates[0];if(next){$('#heroTitle').textContent=next.task.title;$('#heroMessage').textContent=`${formatDue(next.task,next.key)} • ${t(`category_${next.task.category}`)}`;$('#heroBadge').textContent=d('next');$('#mascot').src=categories[next.task.category].asset;$('#mascot').alt=`Qubi ${next.task.category.toLowerCase()} ruhában`;}else{$('#heroTitle').textContent=d('allDoneHero');$('#heroMessage').textContent=d('proud');$('#heroBadge').textContent=d('great');$('#mascot').src='assets/qubi-personal.png'}
 $('#upcomingText').textContent=candidates.length?`${candidates.length} ${d('active')} — ${formatDue(next.task,next.key)}.`:d('upcoming');renderCalendar();checkReminders();
}
let calMode='week',calAnchorDate=new Date();

function renderCalendar(){
 const key=todayKey();
 const anchorStr=calAnchorDate.toLocaleDateString('sv-SE');
 const lang=getLang();
 const locale=(uiText[lang]||uiText.hu).locale;
 const dayNames=d('days');
 
 let periodLabel='';
 let gridHtml='';
 
 if(calMode==='day'){
  periodLabel=calAnchorDate.toLocaleDateString(locale,{year:'numeric',month:'long',day:'numeric',weekday:'long'});
  const dayKey=calAnchorDate.toLocaleDateString('sv-SE');
  const count=activeTasks().filter(t=>occursOn(t,dayKey)).length;
  const dayOfWeekIndex=(calAnchorDate.getDay()+6)%7;
  gridHtml=`<div class="week-card"><button class="day ${dayKey===key?'today':''}" data-date="${dayKey}"><span>${dayNames[dayOfWeekIndex]}</span><strong>${calAnchorDate.getDate()}</strong>${count?`<i>${count}</i>`:''}</button></div>`;
 } else if(calMode==='week'){
  const monday=new Date(calAnchorDate);
  monday.setDate(calAnchorDate.getDate()-((calAnchorDate.getDay()+6)%7));
  const sunday=new Date(monday);
  sunday.setDate(monday.getDate()+6);
  periodLabel=`${monday.toLocaleDateString(locale,{month:'short',day:'numeric'})} – ${sunday.toLocaleDateString(locale,{month:'short',day:'numeric',year:'numeric'})}`;
  
  gridHtml=`<div class="week-card">`+dayNames.map((label,i)=>{
   const date=new Date(monday);
   date.setDate(monday.getDate()+i);
   const dKey=date.toLocaleDateString('sv-SE');
   const count=activeTasks().filter(t=>occursOn(t,dKey)).length;
   return `<button class="day ${dKey===key?'today':''}" data-date="${dKey}"><span>${label}</span><strong>${date.getDate()}</strong>${count?`<i>${count}</i>`:''}</button>`;
  }).join('')+`</div>`;
 } else if(calMode==='month'){
  const year=calAnchorDate.getFullYear();
  const month=calAnchorDate.getMonth();
  periodLabel=calAnchorDate.toLocaleDateString(locale,{year:'numeric',month:'long'});
  
  const firstDay=new Date(year,month,1);
  const startOffset=(firstDay.getDay()+6)%7;
  const startDate=new Date(firstDay);
  startDate.setDate(firstDay.getDate()-startOffset);
  
  let daysArray=[];
  for(let i=0;i<42;i++){
   const date=new Date(startDate);
   date.setDate(startDate.getDate()+i);
   daysArray.push(date);
  }
  
  gridHtml=`<div class="month-grid">`+daysArray.map(date=>{
   const dKey=date.toLocaleDateString('sv-SE');
   const isOtherMonth=date.getMonth()!==month;
   const count=activeTasks().filter(t=>occursOn(t,dKey)).length;
   return `<button class="day ${dKey===key?'today':''} ${isOtherMonth?'other-month':''}" data-date="${dKey}"><strong>${date.getDate()}</strong>${count?`<i>${count}</i>`:''}</button>`;
  }).join('')+`</div>`;
 }
 
 $('#calendarPeriodLabel').textContent=periodLabel;
 $('#calendarGrid').innerHTML=gridHtml;
 
 $$('.cal-mode-btn').forEach(btn=>{
  btn.classList.toggle('active',btn.dataset.calMode===calMode);
 });
 
 const viewTasksDate=calAnchorDate.toLocaleDateString('sv-SE');
 const tasksForSelected=activeTasks().filter(t=>occursOn(t,viewTasksDate)).sort((a,b)=>occurrenceDate(a,viewTasksDate)-occurrenceDate(b,viewTasksDate));
 
 $('#calendarTasks').innerHTML=tasksForSelected.length?tasksForSelected.map(task=>`<div class="calendar-task card" data-id="${task.id}" data-date="${viewTasksDate}"><span>${categories[task.category].icon}</span><div><strong>${escapeHtml(task.title)}</strong>${task.description?`<p class="task-desc">${escapeHtml(task.description)}</p>`:''}<small>${formatDue(task,viewTasksDate)}${task.recurrence?` • ↻ ${recurrenceLabel(task)}`:''}</small></div></div>`).join(''):`<p class="empty-copy">${d('noUpcoming')}</p>`;
}

$$('.cal-mode-btn').forEach(btn=>{
 btn.onclick=()=>{
  calMode=btn.dataset.calMode;
  renderCalendar();
 };
});

$('#calPrevBtn').onclick=()=>{
 if(calMode==='day')calAnchorDate.setDate(calAnchorDate.getDate()-1);
 else if(calMode==='week')calAnchorDate.setDate(calAnchorDate.getDate()-7);
 else if(calMode==='month')calAnchorDate.setMonth(calAnchorDate.getMonth()-1);
 renderCalendar();
};

$('#calNextBtn').onclick=()=>{
 if(calMode==='day')calAnchorDate.setDate(calAnchorDate.getDate()+1);
 else if(calMode==='week')calAnchorDate.setDate(calAnchorDate.getDate()+7);
 else if(calMode==='month')calAnchorDate.setMonth(calAnchorDate.getMonth()+1);
 renderCalendar();
};

$('#calTodayBtn').onclick=()=>{
 calAnchorDate=new Date();
 renderCalendar();
};

$('#calendarGrid').onclick=e=>{
 const dayBtn=e.target.closest('.day[data-date]');
 if(dayBtn){
  const dateStr=dayBtn.dataset.date;
  calAnchorDate=new Date(`${dateStr}T12:00:00`);
  renderCalendar();
 }
};

$('#calendarTasks').onclick=e=>{
 const taskCard=e.target.closest('.calendar-task');
 if(taskCard){
  const task=tasks.find(t=>t.id===taskCard.dataset.id);
  if(task)openEditDialog(task);
 }
};

async function checkReminders(){const now=Date.now(),key=todayKey();for(const task of activeTasks().filter(t=>occursOn(t,key)&&!isDone(t,key)&&t.reminderMinutes!=null)){const at=occurrenceDate(task,key).getTime()-task.reminderMinutes*60000;if(at<=now&&at>now-60000&&!sessionStorage.getItem(`reminded:${task.id}:${key}`)){sessionStorage.setItem(`reminded:${task.id}:${key}`,'1');toast(`🔔 ${task.title}`);playReminderSound();if(Notification.permission==='granted')new Notification('Qubi emlékeztető',{body:task.title,icon:'assets/icon-192.png'})}}}

function showAuth(){user=null;$('#appShell').classList.add('hidden');$('#authView').classList.remove('hidden');applyLanguage();}
async function showApp(){localStorage.setItem('qubi-user',JSON.stringify(user));if(user?.language)localStorage.setItem('qubi-lang',user.language);tasks=await localRead();$('#authView').classList.add('hidden');$('#appShell').classList.remove('hidden');const first=user.preferredName||user.displayName.split(' ')[0];$('#greetingName').textContent=first;$('#profileName').textContent=user.displayName;$('#profileEmail').textContent=user.email;$('#profileDisplayName').value=user.displayName;$('#profilePreferredName').value=user.preferredName||'';$('#profileLanguage').value=user.language||getLang();$('#profileSound').value=user.reminderSound||'gentle';$('#dateLabel').textContent=new Date().toLocaleDateString((uiText[getLang()]||uiText.hu).locale,{month:'long',day:'numeric',weekday:'long'}).toUpperCase();setAvatar($('#profileButton'),user);setAvatar($('#bigAvatar'),user);applyLanguage();render();setOnlineState();sync()}
async function init(){try{const data=await api('/api/auth/me');$('#googleLogin').classList.toggle('hidden',!data.googleEnabled);if(data.user){user=data.user;await showApp()}else{const cached=localStorage.getItem('qubi-user');if(cached){user=JSON.parse(cached);await showApp()}else showAuth()}}catch{const cached=localStorage.getItem('qubi-user');if(cached){user=JSON.parse(cached);await showApp()}else showAuth()}const params=new URLSearchParams(location.search);if(params.get('auth')){$('#authError').textContent=trMsg(params.get('auth')==='failed'?d('googleAuthFailed'):d('googleAuthNotConfigured'));history.replaceState({},'',location.pathname)}}

$$('[data-auth-tab]').forEach(b=>b.onclick=()=>{$$('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===b));$('#loginForm').classList.toggle('hidden',b.dataset.authTab!=='login');$('#registerForm').classList.toggle('hidden',b.dataset.authTab!=='register');$('#authError').textContent=''});
async function authSubmit(form,path){const button=form.querySelector('button[type=submit]');button.disabled=true;$('#authError').textContent='';try{const body=Object.fromEntries(new FormData(form));const data=await api(path,{method:'POST',body:JSON.stringify(body)});user=data.user;await showApp()}catch(error){$('#authError').textContent=trMsg(error.message)}finally{button.disabled=false}}
$('#loginForm').onsubmit=e=>{e.preventDefault();authSubmit(e.target,'/api/auth/login')};$('#registerForm').onsubmit=e=>{e.preventDefault();authSubmit(e.target,'/api/auth/register')};
$('#forgotPasswordBtn').onclick=()=>{$('#forgotStatus').textContent='';$('#forgotDialog').showModal()};$('#closeForgotDialog').onclick=()=>$('#forgotDialog').close();
$('#forgotForm').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button[type=submit]');button.disabled=true;try{const data=await api('/api/auth/forgot-password',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});$('#forgotStatus').textContent=trMsg(data.message)}catch(error){$('#forgotStatus').textContent=trMsg(error.message)}finally{button.disabled=false}};
$('#resetForm').onsubmit=async e=>{e.preventDefault();const token=new URLSearchParams(location.search).get('reset'),password=new FormData(e.target).get('password');try{await api('/api/auth/reset-password',{method:'POST',body:JSON.stringify({token,password})});$('#resetStatus').textContent=d('passwordChanged');setTimeout(()=>{history.replaceState({},'',location.pathname);$('#resetDialog').close()},1600)}catch(error){$('#resetStatus').textContent=trMsg(error.message)}};

$('#taskList').onclick=e=>{
 const row=e.target.closest('.task');if(!row)return;
 const task=tasks.find(t=>t.id===row.dataset.id),key=row.dataset.date||todayKey();if(!task)return;
 if(e.target.closest('.delete-task')){pendingDelete=task;$('#confirmDialog').showModal();return}
 if(e.target.closest('.check')){
  if(task.recurrence){task.completedDates=task.completedDates||[];task.completedDates=task.completedDates.includes(key)?task.completedDates.filter(x=>x!==key):[...task.completedDates,key].sort()}
  else task.done=!task.done;
  task.updatedAt=new Date().toISOString();if(isDone(task,key))toast(d('completed'));queueSync();render();return;
 }
 openEditDialog(task);
};

$('#confirmDelete').onclick=()=>{if(!pendingDelete)return;pendingDelete.deleted=true;pendingDelete.updatedAt=new Date().toISOString();pendingDelete=null;queueSync();render();toast(d('deleted'))};
$$('.filter').forEach(b=>b.onclick=()=>{$$('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render()});$('#categoryGrid').onclick=e=>{const b=e.target.closest('[data-category]');if(!b)return;filter=b.dataset.category;$$('.filter').forEach(x=>x.classList.toggle('active',x.dataset.filter===filter));render()};

const dialog=$('#taskDialog');
function openNewDialog(){
 editingTaskId=null; currentTaskImage=null;
 $('#taskForm').reset();
 $('#dialogEyebrow').textContent=d('newEntry');
 $('#dialogTitle').textContent=d('newMission');
 $('#taskSubmitBtn').textContent=d('addMissionBtn');
 $('#weeklyOptions').classList.add('hidden');
 $('#recurrenceEndLabel').classList.add('hidden');
 $('#imagePreviewContainer').classList.add('hidden');
 $('#taskImagePreview').src='';
 if($('#taskDescription'))$('#taskDescription').value='';
 $('#taskDate').value='';
 $('#noDateToggle').checked=false;
 $('#dateFields').classList.remove('hidden');
 dialog.showModal();setTimeout(()=>$('#taskTitle').focus(),80);
}

function openEditDialog(task){
 editingTaskId=task.id; currentTaskImage=task.image||null;
 $('#dialogEyebrow').textContent=d('editEntry');
 $('#dialogTitle').textContent=d('editMission');
 $('#taskSubmitBtn').textContent=d('saveChanges');
 $('#taskTitle').value=task.title||'';
 if($('#taskDescription'))$('#taskDescription').value=task.description||'';
 const categoryRadio=$(`input[name="category"][value="${task.category}"]`);if(categoryRadio)categoryRadio.checked=true;
 const dateStr=datePart(task)||"";
 $('#taskDate').value=dateStr;
 $('#noDateToggle').checked=!dateStr;
 $('#dateFields').classList.toggle('hidden',!dateStr);
 const due=dueDate(task);
 if(due&&typeof task.dueAt==='string'&&task.dueAt.includes('T'))$('#taskTime').value=due.toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'});
 else $('#taskTime').value='';
 const rec=task.recurrence;
 $('#recurrenceType').value=rec?.frequency||'none';
 const recurring=rec&&rec.frequency!=='none';
 $('#weeklyOptions').classList.toggle('hidden',rec?.frequency!=='weekly');
 $('#recurrenceEndLabel').classList.toggle('hidden',!recurring);
 $('#recurrenceEnd').value=rec?.endDate||'';
 $$('#weeklyOptions input').forEach(input=>{input.checked=(rec?.weekdays||[]).includes(Number(input.value))});
 $('#reminderEnabled').checked=task.reminderMinutes!=null;
 if(currentTaskImage){
  $('#taskImagePreview').src=currentTaskImage;
  $('#imagePreviewContainer').classList.remove('hidden');
 } else {
  $('#imagePreviewContainer').classList.add('hidden');
  $('#taskImagePreview').src='';
 }
 dialog.showModal();setTimeout(()=>$('#taskTitle').focus(),80);
}

$('#noDateToggle').onchange=e=>{
 const isUndated=e.target.checked;
 if(isUndated)$('#taskDate').value='';
 $('#dateFields').classList.toggle('hidden',isUndated);
};

$('#taskDate').oninput=()=>{
 if($('#taskDate').value)$('#noDateToggle').checked=false;
};

$('#addTaskBtn').onclick=openNewDialog;$('#mobileAdd').onclick=openNewDialog;
dialog.querySelector('.icon-btn').onclick=e=>{e.preventDefault();dialog.close()};

$('#taskImage').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  currentTaskImage=await compressImage(file);
  $('#taskImagePreview').src=currentTaskImage;
  $('#imagePreviewContainer').classList.remove('hidden');
 }catch(err){toast(trMsg('A kép feldolgozása nem sikerült.'))}
};

$('#removeImageBtn').onclick=()=>{
 currentTaskImage=null;
 $('#taskImagePreview').src='';
 $('#imagePreviewContainer').classList.add('hidden');
 $('#taskImage').value='';
};

$('#recurrenceType').onchange=()=>{const type=$('#recurrenceType').value,recurring=type!=='none';$('#weeklyOptions').classList.toggle('hidden',type!=='weekly');$('#recurrenceEndLabel').classList.toggle('hidden',!recurring);if(type==='weekly'&&!$('#weeklyOptions input:checked')){const day=keyToDate($('#taskDate').value||todayKey()).getDay();$(`#weeklyOptions input[value="${day}"]`).checked=true}};

$('#taskForm').onsubmit=e=>{
 e.preventDefault();
 const title=$('#taskTitle').value.trim(),isUndated=$('#noDateToggle').checked,date=isUndated?'':$('#taskDate').value,time=$('#taskTime').value,type=$('#recurrenceType').value;
 if(!title)return;
 const description=$('#taskDescription')?.value.trim()||null;
 const dueAt=date?new Date(`${date}T${time||'12:00'}:00`).toISOString():null;

 const reminderMinutes=$('#reminderEnabled').checked&&time?10:null;
 let recurrence=null;
 if(type!=='none'){
  recurrence={frequency:type,endDate:$('#recurrenceEnd').value||null};
  if(type==='weekly'){
   recurrence.weekdays=$$('#weeklyOptions input:checked').map(x=>Number(x.value));
   if(!recurrence.weekdays.length)return toast(d('selectOneDay'));
  }
  if(type==='monthly')recurrence.monthDay=date?keyToDate(date).getDate():1;
 }
 const category=new FormData(e.target).get('category');
 const updatedAt=new Date().toISOString();
 if(editingTaskId){
  const existing=tasks.find(t=>t.id===editingTaskId);
  if(existing){
   existing.title=title; existing.description=description; existing.category=category; existing.dueAt=dueAt; existing.reminderMinutes=reminderMinutes;
   existing.recurrence=recurrence; existing.image=currentTaskImage; existing.updatedAt=updatedAt;
  }
  toast(d('missionUpdated'));
 } else {
  tasks.push({id:crypto.randomUUID(),title,description,category,dueAt,reminderAt:null,reminderMinutes,recurrence,completedDates:[],done:false,deleted:false,image:currentTaskImage,updatedAt});
  toast(recurrence?d('recurringAdded'):d('newAdded'));
 }
 e.target.reset();
 $('#weeklyOptions').classList.add('hidden');$('#recurrenceEndLabel').classList.add('hidden');$('#imagePreviewContainer').classList.add('hidden');
 editingTaskId=null; currentTaskImage=null;
 dialog.close();queueSync();render();
 if(reminderMinutes!=null)enablePush().catch(()=>toast(d('pushFailed')));
};

$$('[data-view]').forEach(b=>b.onclick=()=>{const v=b.dataset.view;$$('.view').forEach(x=>x.classList.remove('active'));$(`#${v}View`).classList.add('active');$$('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));scrollTo({top:0,behavior:'smooth'})});$('#profileButton').onclick=()=>document.querySelector('[data-view="profile"]').click();
$('#logoutBtn').onclick=async()=>{try{await api('/api/auth/logout',{method:'POST'});localStorage.removeItem('qubi-user');showAuth()}catch(error){toast(error.message)}};
$('#profileForm').onsubmit=async e=>{e.preventDefault();try{const file=$('#soundFile').files[0];if(file){if(file.size>1024*1024)return toast(d('soundFileLimit'));const response=await fetch('/api/profile/sound',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':file.type},body:file});if(!response.ok)throw new Error((await response.json()).error||d('soundUploadFailed'));$('#profileSound').value='custom'}const selectedLang=$('#profileLanguage').value;const data=await api('/api/profile',{method:'PUT',body:JSON.stringify({displayName:$('#profileDisplayName').value,preferredName:$('#profilePreferredName').value,language:selectedLang,reminderSound:$('#profileSound').value})});user=data.user;localStorage.setItem('qubi-user',JSON.stringify(user));localStorage.setItem('qubi-lang',selectedLang);location.reload()}catch(error){toast(error.message)}};
$('#inviteFriendBtn').onclick=async()=>{const share={title:'Qubi',text:t('inviteText'),url:'https://qubi.vane.hu'};try{if(navigator.share)await navigator.share(share);else{await navigator.clipboard.writeText(`${share.text} ${share.url}`);toast(t('copied'))}}catch(error){if(error.name!=='AbortError')toast(d('shareFailed'))}};
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
 e.preventDefault();
 deferredInstallPrompt=e;
 const btn=$('#installBtn');
 if(btn)btn.classList.remove('hidden');
});
if($('#installBtn')){
 $('#installBtn').onclick=async()=>{
  if(!deferredInstallPrompt)return;
  deferredInstallPrompt.prompt();
  const choice=await deferredInstallPrompt.userChoice;
  if(choice.outcome==='accepted')$('#installBtn').classList.add('hidden');
  deferredInstallPrompt=null;
 };
}
addEventListener('online',()=>{setOnlineState();sync()});addEventListener('offline',setOnlineState);setInterval(checkReminders,30000);$('#dateLabel').textContent=new Date().toLocaleDateString((uiText[getLang()]||uiText.hu).locale,{month:'long',day:'numeric',weekday:'long'}).toUpperCase();
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));
const resetToken=new URLSearchParams(location.search).get('reset');if(resetToken)addEventListener('DOMContentLoaded',()=>$('#resetDialog').showModal());
function updateScreenDebug(){
 const el = $('#screenDebugInfo');
 if(!el) return;
 const artDisp = window.getComputedStyle($('.auth-art')).display;
 const artImgW = $('.auth-art img') ? window.getComputedStyle($('.auth-art img')).width : 'N/A';
 const brandW = $('.auth-card .brand-mark') ? window.getComputedStyle($('.auth-card .brand-mark')).width : 'N/A';
 el.textContent = `W: ${window.innerWidth}px | Screen: ${screen.width}px | DPR: ${window.devicePixelRatio} | Art: ${artDisp} (img: ${artImgW}) | Brand: ${brandW}`;
}
init();
updateScreenDebug();
window.addEventListener('resize', updateScreenDebug);


