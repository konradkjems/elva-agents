require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function createTestManualReviewWidget() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('elva-agents');
    
    // Get the admin organization
    const adminOrg = await db.collection('organizations').findOne({ 
      name: 'Admin\'s Organization' 
    });
    
    if (!adminOrg) {
      console.log('❌ Admin organization not found');
      return;
    }
    
    // Create test widget with manual review enabled
    const testWidget = {
      _id: new ObjectId(),
      name: 'Test Manual Review Widget',
      description: 'Widget for testing manual review functionality',
      organizationId: adminOrg._id,
      openai: {
        promptId: 'pmpt_68aee2cd8bd881958ad99778533d3d750e3642c07a43035a',
        version: '19'
      },
      theme: {
        buttonColor: '#4f46e5',
        chatBg: '#ffffff',
        width: 450,
        height: 600,
        borderRadius: 20,
        shadow: '0 20px 60px rgba(0,0,0,0.15)'
      },
      branding: {
        title: 'AI Kundeservice Agent',
        assistantName: 'Assistant',
        companyName: 'Test Company',
        showBranding: true,
        avatarUrl: null,
        logoUrl: null
      },
      messages: {
        welcomeMessage: 'Hej! 😊 Jeg er din AI assistent. Hvordan kan jeg hjælpe dig i dag?',
        inputPlaceholder: 'Skriv en besked her',
        typingText: 'AI tænker...',
        suggestedResponses: [
          'Hvordan kan du hjælpe mig?',
          'Hvad er dine muligheder?',
          'Kan du give mig mere information?'
        ],
        popupMessage: 'Hej! 👋 Har du brug for hjælp?',
        popupDelay: 5000,
        disclaimerText: 'Opgiv ikke personlige oplysninger'
      },
      satisfaction: {
        enabled: true,
        triggerAfter: 3,
        inactivityDelay: 15000, // 15 seconds for testing
        promptText: 'Hvordan vil du bedømme samtalen indtil videre?',
        allowFeedback: false,
        feedbackPlaceholder: 'Optional feedback...'
      },
      manualReview: {
        enabled: true,
        buttonText: 'Anmod om Manuel Gennemgang',
        formTitle: 'Anmod om Manuel Gennemgang',
        formDescription: 'Udfyld venligst dine kontaktoplysninger og beskriv hvad du har brug for hjælp til. Vores team vil gennemgå din samtale og vende tilbage til dig.',
        successMessage: 'Tak for din anmodning! Vores team vil gennemgå din samtale og kontakte dig inden for 24 timer.'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert the test widget
    const result = await db.collection('widgets').insertOne(testWidget);
    
    console.log('✅ Test manual review widget created successfully!');
    console.log('Widget ID:', result.insertedId);
    console.log('Widget Name:', testWidget.name);
    console.log('Manual Review Enabled:', testWidget.manualReview.enabled);
    console.log('Button Text:', testWidget.manualReview.buttonText);
    
    // Create a test HTML file for the widget
    const testHtml = `<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Manual Review Widget</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            max-width: 600px;
            text-align: center;
        }
        h1 {
            color: #1f2937;
            margin-bottom: 20px;
        }
        p {
            color: #6b7280;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .instructions {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            text-align: left;
        }
        .instructions h3 {
            color: #374151;
            margin-top: 0;
        }
        .instructions ol {
            color: #6b7280;
            padding-left: 20px;
        }
        .instructions li {
            margin-bottom: 8px;
        }
        .widget-info {
            background: #e0f2fe;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            color: #0369a1;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Test Manual Review Widget</h1>
        <p>Denne side tester manual review funktionaliteten i chat widgetten.</p>
        
        <div class="widget-info">
            <strong>Widget ID:</strong> ${result.insertedId}<br>
            <strong>Manual Review:</strong> Aktiveret<br>
            <strong>Knap Tekst:</strong> ${testWidget.manualReview.buttonText}
        </div>
        
        <div class="instructions">
            <h3>📋 Test Instruktioner:</h3>
            <ol>
                <li>Åbn chat widgetten ved at klikke på chat ikonet nederst til højre</li>
                <li>Start en samtale med AI assistenten</li>
                <li>Send mindst 3 beskeder for at trigge satisfaction rating</li>
                <li>Vent 15 sekunder uden aktivitet for at se satisfaction rating</li>
                <li>Klik på "Anmod om Manuel Gennemgang" knappen</li>
                <li>Udfyld kontaktformularen med test data</li>
                <li>Indsend anmodningen og bekræft success beskeden</li>
                <li>Tjek admin dashboard for at se anmodningen i manual reviews sektionen</li>
            </ol>
        </div>
        
        <div class="instructions">
            <h3>✅ Forventet Resultat:</h3>
            <ul>
                <li>Manual review knap vises i chatten</li>
                <li>Modal formular åbner når knappen klikkes</li>
                <li>Formular validerer påkrævede felter (navn, email, telefon, besked)</li>
                <li>Success besked vises efter indsendelse</li>
                <li>Anmodning vises i admin dashboard under "Manual Reviews"</li>
                <li>Admin kan opdatere status: pending → in_review → completed</li>
            </ul>
        </div>
        
        <p><strong>Note:</strong> Åbn browser developer tools (F12) for at se console logs og debug information.</p>
    </div>

    <!-- Widget Embed Script -->
    <script src="https://elva-agents.vercel.app/api/widget-embed/${result.insertedId}"></script>
</body>
</html>`;
    
    // Write test HTML file
    const fs = require('fs');
    const path = require('path');
    const testFilePath = path.join(__dirname, '..', 'public', 'test-manual-review.html');
    
    fs.writeFileSync(testFilePath, testHtml);
    
    console.log('✅ Test HTML file created:', testFilePath);
    console.log('🌐 Test URL: https://elva-agents.vercel.app/test-manual-review.html');
    
  } catch (error) {
    console.error('❌ Error creating test manual review widget:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  createTestManualReviewWidget();
}

module.exports = { createTestManualReviewWidget };
