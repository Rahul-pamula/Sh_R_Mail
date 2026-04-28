import json
import re

filepath = '/Users/rahul/Desktop/Sh_R_Mail/docs/progress.html'

with open(filepath, 'r') as f:
    content = f.read()

# Extract the phasesData array
match = re.search(r'const phasesData = (\[.*?\]);', content, re.DOTALL)
if not match:
    print("Could not find phasesData in progress.html")
    exit(1)

phases_json = match.group(1)
phases_data = json.loads(phases_json)

tasks_to_complete = [
    "task_phase_8_1__establishes_the_wo",
    "task_phase_8_2__implements_team_ma",
    "task_phase_8_3__extends_that_model",
    "task_phase_8_5__hardens_the_whole",
    "task_normalize_role_definitions_at",
    "task_ensure_all_administrative_writ",
    "task_workspace_administration_ia_fi",
    "task_role_matrix_defined_for_owner",
    "task_organization_settings_section",
    "task_implement_voluntary_leave_flow",
    "task_add_a_self_service__leave_work",
    "task_owner__admin__creator__and_vie",
    "task_role_assignment_and_role_updat",
    "task_voluntary_leave_flow_for_non_o",
    "task_prevent_last_owner_exit_or_del",
    "task_immutable_audit_log_table_reco",
    "task_log_severity_levels_distinguis",
    "task_audit_log_viewer_ui_component",
    "task_log_severity_levels__info___wa",
    "task_custom_email_password_auth_usi",
    "task_jwt_payloads_carry__tenant_id",
    "task_tenant_membership_model_linkin",
    "task_onboarding_apis_providing_step",
    "task_active_tenant_request_time_gua",
    "task_modern_login_and_signup_pages",
    "task_sidebar_navigation_layout_gove",
    "task_global__authcontext__distribut",
    "task_middleware_executing_route_pro",
    "task_auth_me_fully_implemented",
    "task_all_onboarding_endpoints_use_j",
    "task_login_page",
    "task_signup_page",
    "task_route_protection_is_fully_cent"
]

updated_count = 0
for phase in phases_data:
    for task in phase.get('tasks', []):
        if task['id'] in tasks_to_complete:
            if not task['done']:
                task['done'] = True
                task['desc'] = "Completed as part of system-wide role reorganization and workspace administration hardening."
                updated_count += 1

if updated_count > 0:
    new_phases_json = json.dumps(phases_data, indent=2)
    # Replace the old JSON with the new one
    new_content = content.replace(phases_json, new_phases_json)
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"Updated {updated_count} tasks in progress.html")
else:
    print("No tasks updated.")
