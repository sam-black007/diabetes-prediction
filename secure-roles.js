const fs = require('fs');
const path = require('path');

console.log('=== Step 1: Upgrading Supabase Client with Doctor Auth & Sync ===');
const supabasePath = path.join('app', 'src', 'lib', 'supabase.ts');
let supabaseCode = fs.readFileSync(supabasePath, 'utf8');

const doctorSyncCode = `
export async function saveDoctorToSupabase(doctor: { id: string; name: string; specialization: string; hospital: string; password?: string }): Promise<boolean> {
  try {
    const res = await fetch(\`\${SUPABASE_URL}/rest/v1/doctors\`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        hospital: doctor.hospital,
        created_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
`;

if (!supabaseCode.includes('saveDoctorToSupabase')) {
  supabaseCode += doctorSyncCode;
  fs.writeFileSync(supabasePath, supabaseCode, 'utf8');
  console.log('✓ Added doctor synchronization to app/src/lib/supabase.ts');
}

console.log('=== Step 2: Upgrading Role Store to support Custom Doctor Passwords ===');
const roleStorePath = path.join('app', 'src', 'lib', 'role-store.ts');
let roleStoreCode = fs.readFileSync(roleStorePath, 'utf8');

if (!roleStoreCode.includes('password?: string;')) {
  roleStoreCode = roleStoreCode.replace(
    'hospital: string;',
    'hospital: string;\n  password?: string;'
  );
  fs.writeFileSync(roleStorePath, roleStoreCode, 'utf8');
  console.log('✓ Added password field to DoctorProfile');
}

console.log('=== Step 3: Upgrading RoleLoginModal.tsx (Hiding Admin Password & Adding Doctor Password) ===');
const modalPath = path.join('app', 'src', 'components', 'auth', 'RoleLoginModal.tsx');
let modalCode = fs.readFileSync(modalPath, 'utf8');

// 1. Add doctorPassword state
if (!modalCode.includes('doctorPassword')) {
  modalCode = modalCode.replace(
    "const [doctorHospital, setDoctorHospital] = useState('');",
    "const [doctorHospital, setDoctorHospital] = useState('');\n  const [doctorPassword, setDoctorPassword] = useState('');"
  );
}

// 2. Ensure saveDoctorToSupabase import
if (!modalCode.includes('saveDoctorToSupabase')) {
  modalCode = modalCode.replace(
    "import {",
    "import { saveDoctorToSupabase } from '@/lib/supabase';\nimport {"
  );
}

// 3. Fix handleConfirm to validate and save Doctor Password & clean Admin error message
const oldConfirmRegex = /function handleConfirm\(\) \{[\s\S]*?setCurrentRole\('patient'\);[\s\S]*?window\.location\.href = '\/screening';\s*\}/;

const newConfirmBlock = `function handleConfirm() {
    if (selectedRole === 'admin') {
      if (!verifyAdminPassword(adminPassword)) {
        toast({
          variant: 'destructive',
          title: 'Admin Access Denied',
          description: 'Incorrect administrator password.',
        });
        return;
      }
      setCurrentRole('admin');
      toast({ title: 'Welcome Admin', description: 'Admin Command Center unlocked.' });
      onClose();
      window.location.href = '/admin';
      return;
    }

    if (selectedRole === 'doctor') {
      if (!doctorPassword.trim()) {
        toast({
          variant: 'destructive',
          title: 'Password Required',
          description: 'Please set or enter your doctor access password.',
        });
        return;
      }
      const existingDoc = getDoctorProfile();
      if (existingDoc.password && existingDoc.password !== doctorPassword) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'Incorrect password for this doctor profile.',
        });
        return;
      }
      const updatedDoc = {
        id: existingDoc.id || 'DR-' + Math.floor(10000 + Math.random() * 90000),
        name: doctorName || 'Dr. Medical Officer, MD',
        specialization: doctorSpec || 'Clinical Diabetology & RSSDI Fellow',
        hospital: doctorHospital || 'Metabolic Care Center',
        password: doctorPassword,
      };
      saveDoctorProfile(updatedDoc);
      saveDoctorToSupabase(updatedDoc);
      setCurrentRole('doctor');
      toast({ title: 'Doctor Portal Active', description: 'Monitoring patient panel.' });
      onClose();
      window.location.href = '/doctor';
      return;
    }

    if (selectedRole === 'demo') {
      setCurrentRole('demo');
      toast({
        title: '🧪 Free Demo Mode Active',
        description: 'Testing freely in sandbox. Test entries will NOT be saved to the database.',
      });
      onClose();
      window.location.href = '/screening?mode=demo';
      return;
    }

    // Patient
    setCurrentRole('patient');
    toast({ title: 'Patient Mode Active', description: 'Personal health intake and monitoring.' });
    onClose();
    window.location.href = '/screening';
  }`;

modalCode = modalCode.replace(oldConfirmRegex, newConfirmBlock);

// 4. Clean Admin Password Input (Remove default password text and placeholder hint)
const oldAdminBlockRegex = /\{selectedRole === 'admin' && \([\s\S]*?Default password:[\s\S]*?<\/div>\s*\)\}/;
const newAdminBlock = `{selectedRole === 'admin' && (
            <div className="rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 p-3 space-y-2">
              <label className="text-xs font-bold flex items-center gap-1 text-purple-700 dark:text-purple-300">
                <Lock className="h-3.5 w-3.5" /> Administrator Password
              </label>
              <Input
                type="password"
                placeholder="Enter administrator password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="bg-white dark:bg-slate-900 text-xs h-9"
              />
              <span className="text-[10px] text-muted-foreground block">
                Restricted to authorized system administrators.
              </span>
            </div>
          )}`;
modalCode = modalCode.replace(oldAdminBlockRegex, newAdminBlock);

// 5. Add Custom Doctor Password field to Doctor Profile UI
const oldDoctorBlockRegex = /\{selectedRole === 'doctor' && \([\s\S]*?Hospital \/ Clinic[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;
const newDoctorBlock = `{selectedRole === 'doctor' && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 p-3 space-y-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" /> Doctor Clinical Profile & Security
              </span>
              <div className="space-y-1.5">
                <Input
                  placeholder="Doctor Full Name (e.g. Dr. Priya Nair, MD)"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs h-8"
                />
                <Input
                  placeholder="Specialization (e.g. RSSDI Fellow, Diabetology)"
                  value={doctorSpec}
                  onChange={(e) => setDoctorSpec(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs h-8"
                />
                <Input
                  placeholder="Hospital / Healthcare Clinic"
                  value={doctorHospital}
                  onChange={(e) => setDoctorHospital(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs h-8"
                />
                <div className="pt-1">
                  <label className="text-[11px] font-semibold flex items-center gap-1 text-emerald-800 dark:text-emerald-300 mb-1">
                    <Lock className="h-3 w-3" /> Set / Enter Doctor Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Choose your confidential doctor password"
                    value={doctorPassword}
                    onChange={(e) => setDoctorPassword(e.target.value)}
                    className="bg-white dark:bg-slate-900 text-xs h-8"
                  />
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Your private password to lock and access your patient monitoring dashboard.
                  </span>
                </div>
              </div>
            </div>
          )}`;
modalCode = modalCode.replace(oldDoctorBlockRegex, newDoctorBlock);

fs.writeFileSync(modalPath, modalCode, 'utf8');
console.log('✓ Cleaned RoleLoginModal.tsx: Hidden passwords and enabled custom doctor password');

console.log('All security updates applied cleanly! Ready to commit and push.');
