import { redirect } from 'next/navigation';

export default function LegacyCreateWorkspaceRedirect() {
    redirect('/account?create=true');
}
