/**
 * Replaces placeholders in a template string with values from a data object.
 * Template syntax: {{variable_name}}
 * 
 * @param template The template string
 * @param data The data object containing values for placeholders
 * @returns The processed string
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        return data[trimmedKey] !== undefined ? String(data[trimmedKey]) : match;
    });
}

/**
 * Extracts all unique variable names from a template string.
 * 
 * @param template The template string
 * @returns Array of variable names
 */
export function getTemplateVariables(template: string): string[] {
    const matches = template.matchAll(/\{\{(.*?)\}\}/g);
    const variables = new Set<string>();
    for (const match of matches) {
        variables.add(match[1].trim());
    }
    return Array.from(variables);
}
