// Browser-only demonstration. It never contacts the production API or stores passwords.
const KEY='atlas-public-demo-v1';
const sessionKey=KEY+'-session';
const uid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
export function resetDemo(){localStorage.removeItem(KEY);localStorage.removeItem(sessionKey);location.reload()}
function initial(){
 const users=[{id:'demo-admin',name:'演示管理员',email:'admin@demo.atlas.test',role:'admin'},{id:'demo-customer',name:'演示客户',email:'customer@demo.atlas.test',role:'customer'}];
 const samples=[['Northstar Trading Ltd','UK','registered','paid'],['Blue Ocean Commerce LLC','US','reviewing','paid'],['Morrow Studio Ltd','UK','needs_info','pending'],['Pacific Ventures LLC','US','filed','unpaid']];
 const companies=samples.map(([name,country,status,payment_status],i)=>({id:'demo-company-'+i,user_id:'demo-customer',name,country,entity:country==='UK'?'Ltd':'LLC',director:'演示负责人',address:'演示地址 · 请勿填写真实资料',business:'跨境电商与咨询服务（演示资料）',status,amount:country==='UK'?29900:49900,currency:'USD',created_at:'2026-10-08T03:00:00.000Z',payment_status}));
 const events=companies.flatMap(c=>[{id:uid(),company_id:c.id,status:'submitted',note:'注册申请已提交（演示）',created_at:'2026-10-05T03:00:00.000Z'},{id:uid(),company_id:c.id,status:c.status,note:c.status==='registered'?'公司注册完成（演示）':'运营团队正在跟进（演示）',created_at:c.created_at}]);
 const payments=companies.filter(c=>c.payment_status!=='unpaid').map(c=>({id:uid(),company_id:c.id,amount:c.amount,currency:c.currency,method:'manual',status:c.payment_status,reference:'[Airwallex] 演示付款凭证',created_at:c.created_at}));
 return {users,companies,events,payments};
}
function read(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d?.users&&d?.companies&&d?.events&&d?.payments)return d}catch{}const d=initial();write(d);return d}
function write(d){localStorage.setItem(KEY,JSON.stringify(d))}
export async function demoApi(path,b){
 const d=read();const u=d.users.find(x=>x.id===localStorage.getItem(sessionKey));
 if(path==='/me')return u||null;
 if(path==='/config')return {stripeEnabled:false,prices:{UK:{amount:29900,currency:'USD'},US:{amount:49900,currency:'USD'}},demo:true};
 if(path==='/auth/logout'){localStorage.removeItem(sessionKey);return {ok:true}}
 if(path==='/auth/login'){const user=d.users.find(x=>x.email===b.email?.trim().toLowerCase());if(!user)throw Error('演示账户不存在，请点击下方的快捷体验按钮');localStorage.setItem(sessionKey,user.id);return user}
 if(path==='/auth/register'){if(!b.name?.trim()||!/^\S+@\S+\.\S+$/.test(b.email)||!b.password||b.password.length<12)throw Error('请填写演示姓名、邮箱和至少12位占位密码；密码不会保存');const email=b.email.trim().toLowerCase();if(d.users.some(x=>x.email===email))throw Error('该演示邮箱已注册');const user={id:uid(),email,name:b.name.trim(),role:'customer'};d.users.push(user);write(d);localStorage.setItem(sessionKey,user.id);return user}
 if(!u)throw Error('请先选择体验角色');
 if(path==='/companies'&&!b)return d.companies.filter(c=>u.role==='admin'||c.user_id===u.id).map(c=>({...c,customer:d.users.find(x=>x.id===c.user_id)?.name,email:d.users.find(x=>x.id===c.user_id)?.email,payment_status:d.payments.filter(p=>p.company_id===c.id).sort((a,z)=>(a.status==='paid'?-1:z.status==='paid'?1:z.created_at.localeCompare(a.created_at)))[0]?.status||'unpaid'}));
 if(path==='/companies'&&b){if(!['UK','US'].includes(b.country)||!['name','director','address','business'].every(k=>typeof b[k]==='string'&&b[k].trim()))throw Error('请完整填写演示申请');const c={...b,id:uid(),user_id:u.id,entity:b.country==='UK'?'Ltd':'LLC',status:'submitted',amount:b.country==='UK'?29900:49900,currency:'USD',created_at:now()};d.companies.unshift(c);d.events.push({id:uid(),company_id:c.id,status:'submitted',note:'客户提交注册资料（浏览器演示）',created_at:now()});write(d);return c}
 const m=path.match(/^\/companies\/([^/]+)(?:\/(status|payments|checkout))?$/);
 if(m){const c=d.companies.find(c=>c.id===m[1]&&(u.role==='admin'||c.user_id===u.id));if(!c)throw Error('演示公司不存在');
  if(!m[2])return {...c,events:d.events.filter(e=>e.company_id===c.id),payments:d.payments.filter(p=>p.company_id===c.id).sort((a,z)=>z.created_at.localeCompare(a.created_at))};
  if(m[2]==='status'){if(u.role!=='admin')throw Error('请选择管理端体验');if(!['submitted','reviewing','needs_info','filed','registered','rejected'].includes(b.status)||!b.note?.trim())throw Error('请选择状态并填写说明');c.status=b.status;d.events.push({id:uid(),company_id:c.id,status:b.status,note:b.note.trim(),created_at:now()});write(d);return {ok:true}}
  if(m[2]==='payments'){if(d.payments.some(p=>p.company_id===c.id&&['paid','pending'].includes(p.status)))throw Error('已有已付款或待审核记录');const channels={alipay:'支付宝',wechat:'微信支付',bank:'对公转账',airwallex:'Airwallex'};if(!channels[b.channel]||!b.reference?.trim())throw Error('请选择渠道并填写演示凭证');d.payments.push({id:uid(),company_id:c.id,amount:c.amount,currency:c.currency,method:'manual',status:'pending',reference:`[${channels[b.channel]}] ${b.reference.trim()}`,created_at:now()});write(d);return {ok:true}}
  throw Error('演示版不处理真实付款');
 }
 const p=path.match(/^\/payments\/([^/]+)\/review$/);
 if(p){if(u.role!=='admin')throw Error('请选择管理端体验');const payment=d.payments.find(x=>x.id===p[1]);if(!payment||payment.status!=='pending'||!['paid','rejected'].includes(b.status))throw Error('该演示记录不可审核');payment.status=b.status;write(d);return {ok:true}}
 throw Error('演示功能尚未提供');
}
