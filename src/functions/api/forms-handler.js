// /functions/api/forms-handler.js
export async function onRequest(context) {
  try {
    // Parse form data
    const formData = await context.request.formData();
    
    // Process form values, handling arrays properly
    const formValues = {};
    for (const [key, value] of formData.entries()) {
      // Handle checkbox arrays (products[])
      if (key.endsWith('[]')) {
        const cleanKey = key.replace('[]', '');
        if (!formValues[cleanKey]) {
          formValues[cleanKey] = [];
        }
        formValues[cleanKey].push(value);
      } else {
        formValues[key] = value;
      }
    }
    
    console.log('Form data being sent to Airtable:', formValues);
    
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
      const errorData = await response.json().catch(() => null);
      console.error('Airtable API error:', errorData || response.statusText);
      throw new Error(`Failed to submit to Airtable: ${response.status} ${response.statusText}`);
    }
    
    // Redirect to thank you page
    return Response.redirect(`${new URL(context.request.url).origin}/thank-you`, 303);
  } catch (error) {
    return new Response(`Error processing your submission: ${error.message}`, {
      status: 500
    });
  }
}
    // Redirect to thank you page
    return Response.redirect(`${new URL(context.request.url).origin}/thank-you`, 303);
  } catch (error) {
    return new Response(`Error processing your submission: ${error.message}`, {
      status: 500
    });
  }
}
