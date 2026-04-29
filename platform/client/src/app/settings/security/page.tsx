import { redirect } from 'next/navigation';

export default function LegacySettingsSecurityRedirect() {
    redirect('/account/security');
}
