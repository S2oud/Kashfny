// Deterministic job-intent rules shared by search and saved-history rendering.
// Nationality, HR, careers and generic opportunities alone are not job offers.
export function jobSignals(value){
 const t=String(value||'').normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/[_#:：]/g,' ').replace(/\s+/g,' ');
 const direct=/\b(?:we(?:['’]re| are)?\s+(?:currently\s+)?hiring|now hiring|wearehiring|nowhiring|jobopenings?|jobvacanc(?:y|ies)|hiringalert|hiring\s+(?:uae|emirati|engineers?|graduates?|for|an?\b)|job\s+(?:openings?|vacanc(?:y|ies)|opportunit(?:y|ies)|offers?)|open\s+(?:positions?|roles?)|career opportunit(?:y|ies)|join our team|we (?:have|are offering) an? opening|recruiting for|walk[- ]in interviews?)\b|(?:فرص(?:ة)? (?:عمل|وظيف)|وظائف|وظيفة شاغرة|شواغر|شاغر وظيفي|نبحث عن موظف|نعلن عن توفر|انضم (?:الي|الى) فريق|مطلوب للتوظيف|مطلوب (?:موظف|محاسب|مهندس|مدير|اخصائي|مصمم|مندوب|فني|ممرض|مواطن)|باب التوظيف|نحن نوظف|تقدم للوظيفة|التقديم (?:على|علي) الوظائف)/i.test(t);
 const cv=/(?:send|share|submit|email|forward|accepting|welcome|collecting).{0,65}\b(?:cvs?|resumes?|curriculum vitae)\b|\b(?:cvs?|resumes?)\b.{0,35}(?:welcome|invited|accepted)|(?:ارسل|ارسال|تقديم|شارك).{0,50}(?:سيرتك|السيرة الذاتية|السير الذاتية)/i.test(t);
 const apply=/applications? (?:are )?(?:open|welcome|invited)|interested candidates|(?:apply|applications?).{0,55}(?:role|position|vacanc|job|internship|graduate program)|(?:فرصة تدريب|برنامج (?:تدريب|الخريجين)).{0,65}(?:تقديم|سجل|توظيف)|(?:قدم|تقدم|التقديم|سجل).{0,65}(?:تدريب|وظيف|خريج)/i.test(t);
 const training=/(?:internship|apprenticeship|graduate (?:program|programme|scheme)).{0,65}(?:applications?|employment|opportunit|join|apply)|(?:join|apply|paid).{0,45}(?:internship|apprenticeship)/i.test(t);
 const negated=/\b(?:not|aren't|are not) (?:currently )?hiring\b|no (?:current )?(?:vacancies|job openings)|لا (?:يوجد|توجد) (?:وظائف|شواغر)/i.test(t);
 const advice=/\b(?:hiring trends|recruitment trends|career advice|cv writing|resume writing|job search tips|recruitment webinar)\b|نصائح (?:التوظيف|للبحث)|ورشة.{0,25}(?:سيرة|توظيف)/i.test(t);
 if((negated||advice)&&!cv&&!apply&&!training)return {classification:'not-job-related',signals:[]};
 const signals=[direct?'job-offer':null,cv?'cv-invitation':null,apply?'applications':null,training?'employment-training':null].filter(Boolean);
 return {classification:signals.length?'job-related':'not-job-related',signals};
}
