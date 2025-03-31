// /functions/api/submit.js
export async function onRequest(context) {
  try {
    // Parse form data
    const formData = await context.request.formData();
    const formValues = Object.fromEntries(formData.entries());
    
    // Connect to Airtable
    const response = await fetch(
      `https://api.airtable.com/v0/${context.env.AIRTABLE_BASE_ID}/${context.env.AIRTABLE_TABLE_NAME}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${context.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: formValues
        })
      }
    );
    
    // Check for success
    if (!response.ok) {
      throw new Error('Failed to submit to Airtable');
    }
    
    // Redirect to thank you page
    return Response.redirect(`${new URL(context.request.url).origin}/thank-you`, 303);
  } catch (error) {
    return new Response(`Error processing your submission: ${error.message}`, {
      status: 500
    });
  }
}
