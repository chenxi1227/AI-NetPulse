from localAI_Reviw_files import my_classify_site


def my(target_site, search_context):
    result = my_classify_site(target_site, search_context)
    return "True" if result.get("is_ai") else "False"
