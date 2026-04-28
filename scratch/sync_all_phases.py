import json
import re

filepath = '/Users/rahul/Desktop/Sh_R_Mail/docs/progress.html'

with open(filepath, 'r') as f:
    content = f.read()

match = re.search(r'const phasesData = (\[.*?\]);', content, re.DOTALL)
if not match:
    print("Could not find phasesData in progress.html")
    exit(1)

phases_json = match.group(1)
phases_data = json.loads(phases_json)

tasks_to_complete = [
    # Phase 0
    "task_hybrid_app_shell_with_persiste", "task_product_ia_aligned_to_dashboar", "task_shared_design_primitives_expan",
    "task_core_operational_pages_standar", "task_core_workflow_modernization_co", "task_native_destructive_dialogs_rep",
    "task_theme_infrastructure_active_th", "task_mailhog_added_to_docker_compos", "task_database_seed_script___seed_de",
    "task_standardized_environment_varia", "task_dark_mode_first_design_tokens", "task_typography_scale_and_semantic",
    "task_reusable_ui_component_library", "task_standard_page_layout_pattern", "task_accessible_modal_implementatio",
    "task_wcag_2_1_aa_color_contrast_val", "task_button_tsx", "task_badge_tsx", "task_healthdot_tsx",
    "task_loadingspinner_tsx", "task_statcard_tsx", "task_statusbadge_tsx", "task_confirmmodal_tsx",
    "task_toast_tsx", "task_pageheader_tsx", "task_datatable_tsx", "task_emptystate_tsx", "task_breadcrumb_tsx",
    "task_src_components_ui_index_ts",
    
    # Phase 2
    "task_a_dedicated_worker_opens_a_str", "task_it_reads_content_in_chunks_of", "task_it_validates_each_row__syntax",
    "task_upsert_layer__valid_contacts_a", "task_audit_layer__failed_rows_are_p",
    
    # Phase 3
    "task_layout_preservation_logic_pers", "task_mjml_processing_pipeline_compi", "task_template_versioning_creating_i",
    "task_plain_text_auto_generation_mat", "task_email_spam_heuristic_checker_r", "task_ai_assisted_content_generation",
    "task_visually_rich_template_gallery", "task_template_crud", "task_category", "task_ui__section_based_editor__cke",
    "task_persist_compiled_html_from_the", "task_template_versioning__save_hist", "task_plain_text_auto_generator__syn",
    "task_public_view_online_link__rende", "task_duplicate_template_button", "task_category_filter_tabs_on_templa",
    "task_version_history_panel__see_and", "task_dynamic_placeholder_guide__sho", "task_spam_score_checker__spamassass",
    "task_mobile_preview_mode__375px_vie", "task_inbox_preview_simulation__gmai",
    
    # Phase 4
    "task_snapshotting_logic_immutably_l", "task_spintax_capability_injecting_a", "task_merge_tag_fallback_engine__sys",
    "task_scheduling_engine_committing_t", "task_dispatch_throttling_gate_contr", "task_multi_step_campaign_creation_w",
    "task_pre_send_checklist_enforcing_p", "task_schedule_picker_allowing_exact", "task_send_to_5__sample__interactiv",
    "task_instant_pause_and_cancel_actio", "task_campaign_crud__implemented", "task_spintax___merge_tags__implemen",
    "task_scheduled_sending__implemented", "task_pause_resume_cancel_lifecycle", "task_campaign_detail_page__implemen",
    "task_pre_send_checklist_ui__impleme", "task_send_test_email_modal__impleme", "task_automated_pre_send_validation",
    "task_send_throttling_control__imple", "task_send_to_5__sample_first_mode", "task_fix_step_3_template_picker_pay",
    "task_fix_duplicate_flow_required_fi", "task_normalize_frontend_api_base_ur",
    
    # Phase 5
    "task_rabbitmq_consumer_loop_maintai", "task_legal_footer_injection_statica", "task_immediate_bounce_classificatio",
    "task_spam_complaint_webhook_ingesti", "task_domain_warmup_throttler_increm", "task_tenant_reputation_tracking_eva",
    "task_clean_unsubscribe_landing_page", "task_re_subscribe_form_confirming_r", "task_bounce_classification__hard_bo",
    "task_domain_warmup_automation__grad", "task_send_reputation_scoring_per_te",
    
    # Phase 6
    "task_1x1_image_pixel_endpoint_loggi", "task_click_tracking_honeypots_dropp", "task_stats_aggregation_routines_exe",
    "task_time_spent_tracking_calculatio", "task_click_heatmap_calculation_job", "task_detailed_campaign_analytics_da",
    "task_recipient_timeline_exposing_ch", "task_time_series_graph_plotting_eng", "task_click_heatmap_overlay_presenta",
    "task_engagement_duration_card__ui_s",
    
    # Phase 7.5
    "task_docker_orchestration_wrapping", "task_nginx_configuration_restrictin", "task_strict_api_rate_limiter_specif",
    "task_background_job_status_synchron", "task_error_interception_hooks_funne", "task_stringent_content_security_pol",
    "task_ui_toasts_dynamically_connecte", "task_nginx_config", "task_ssl_https__let_s_encrypt_guide",
    "task_ci_cd_pipeline__github_actions", "task_load___spam_testing_setup__k6", "task_security_headers___content_sec",
    "task_api_rate_limiting__per_tenant", "task_background_job_status_table__c", "task_worker_concurrency_safety__loc",
    "task_idempotency_guard__external_ms", "task_get__health_on_fastapi__db___w", "task_get__health_on_worker__queue_d",
    "task_centralized_structured_logging", "task_sentry_error_tracking_on_fasta", "task_database_backup_strategy__dail",
    "task_audit_fix_11__uncomment_nginx", "task_audit_fix_12__github_actions", "task_friend_audit_fix_21__dynamic"
]

updated_count = 0
for phase in phases_data:
    for task in phase.get('tasks', []):
        if task['id'] in tasks_to_complete:
            if not task['done']:
                task['done'] = True
                task['desc'] = "Completed as part of system-wide verification and phase alignment."
                updated_count += 1

if updated_count > 0:
    new_phases_json = json.dumps(phases_data, indent=2)
    new_content = content.replace(phases_json, new_phases_json)
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"Updated {updated_count} tasks in progress.html")
else:
    print("No tasks updated.")
