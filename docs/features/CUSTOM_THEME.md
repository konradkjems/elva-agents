# 🎨 Custom Organization Theme

**Oprettet:** Oktober 17, 2025  
**Funktion:** Anvend organizations primary color som farvetema på hele admin platformen

## 📋 Oversigt

Organizations kan nu bruge deres primary color som et custom farvetema på hele admin platformen. Dette giver en mere branded oplevelse og gør platformen mere personlig for hver organization.

## 🎯 Funktioner

### 1. Custom Theme Toggle
- **Placering:** Organization Settings → General Settings
- **Funktionalitet:** Tænd/sluk for custom farvetema
- **Standard:** Slukket (bruger platform defaults)

### 2. Dynamisk Farveapplikation
- Anvender organization's primary color på:
  - Primary buttons og call-to-actions
  - Focus states (ring color)
  - Accent farver
  - Navigation highlights

### 3. Intelligent Kontrast
- Beregner automatisk kontrast farver for tekst
- Sikrer læsbarhed på både lyse og mørke baggrunde
- Fungerer i både light og dark mode

## 🔧 Teknisk Implementation

### Komponenter

#### 1. **ThemeProvider** (`components/admin/ThemeProvider.js`)
Ansvarlig for at:
- Hente organization settings
- Konvertere HEX farver til HSL
- Opdatere CSS variabler dynamisk
- Håndtere theme activation/deactivation

#### 2. **Organization Settings** (`pages/admin/organizations/settings.js`)
- Switch component til at tænde/slukke custom theme
- Color picker til primary color
- Gemmer `useCustomTheme` boolean i database

#### 3. **API Backend** (`pages/api/organizations/[id]/index.js`)
- Gemmer `useCustomTheme` field
- Returnerer theme settings til frontend

### CSS Variabler

Følgende CSS variabler opdateres når custom theme er aktiveret:

```css
--primary: <h> <s>% <l>%
--primary-foreground: <h> <s>% <foregroundL>%
--accent: <h> <s-10>% <l+10>%
--accent-foreground: <h> <s>% <foregroundL>%
--ring: <h> <s>% <l>%
```

### Farve Konvertering

**HEX → HSL:**
```javascript
// Eksempel: #1E40AF → HSL(217, 71%, 40%)
hexToHSL("#1E40AF")
// Returns: { h: 217, s: 71, l: 40 }
```

**Kontrast Beregning:**
```javascript
// Lys baggrund (l > 50%) → Mørk tekst (l = 10%)
// Mørk baggrund (l ≤ 50%) → Lys tekst (l = 98%)
const foregroundL = hsl.l > 50 ? 10 : 98;
```

## 📖 Bruger Guide

### Aktivér Custom Theme

1. **Gå til Organization Settings:**
   - Klik på organization dropdown i toppen
   - Vælg "Settings"

2. **Vælg Primary Color:**
   - Find "Primary Color" feltet
   - Vælg din ønskede farve med color picker
   - Eller indtast HEX kode direkte

3. **Aktivér Custom Theme:**
   - Find "Brug Custom Farvetema" switch
   - Tænd switchen
   - Klik "Save Changes"

4. **Se Resultatet:**
   - Platformen opdateres øjeblikkeligt
   - Primary color anvendes på buttons, links, og highlights
   - Navigation og focus states bruger din farve

### Deaktivér Custom Theme

1. Gå til Organization Settings
2. Sluk "Brug Custom Farvetema" switch
3. Klik "Save Changes"
4. Platformen returnerer til default farvetema

## 🎨 Anbefalede Farver

### Blå Toner (Professional)
- `#1E40AF` - Classic Blue (default)
- `#0284C7` - Sky Blue
- `#1D4ED8` - Royal Blue

### Grøn Toner (Growth/Eco)
- `#059669` - Emerald Green
- `#10B981` - Success Green
- `#16A34A` - Forest Green

### Lilla Toner (Creative)
- `#7C3AED` - Purple
- `#8B5CF6` - Violet
- `#A855F7` - Bright Purple

### Rød Toner (Energy/Bold)
- `#DC2626` - Red
- `#EF4444` - Bright Red
- `#F97316` - Orange Red

## ⚙️ Database Schema

```javascript
{
  _id: ObjectId,
  name: String,
  primaryColor: String,        // HEX color (e.g., "#1E40AF")
  useCustomTheme: Boolean,     // true/false
  // ... andre felter
}
```

## 🔍 Fejlfinding

### Theme Opdateres Ikke
1. Tjek at `useCustomTheme` er `true` i database
2. Verificer at `primaryColor` er en valid HEX color
3. Check browser console for fejl
4. Prøv at refresh siden (Cmd+R / Ctrl+R)

### Dårlig Kontrast
- Vælg en farve med medium lightness (30-70%)
- Undgå meget lyse farver (#F0F0F0+)
- Undgå meget mørke farver (#101010-)

### Theme Forbliver Efter Deaktivering
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
3. Tjek at `useCustomTheme` er `false` i database

## 🚀 Fremtidige Forbedringer

### Potentielle Features
- [ ] Multiple theme colors (primary, secondary, accent)
- [ ] Dark mode specific colors
- [ ] Theme preview før aktivering
- [ ] Saved theme presets
- [ ] Custom font selection
- [ ] Logo upload og branding

### Performance Optimering
- [ ] Cache theme settings i session storage
- [ ] Batch CSS variable updates
- [ ] Preload theme on initial render

## 📝 Eksempel Kode

### Brug Custom Color i Components

```jsx
// Button med primary color (automatisk themed)
<Button className="bg-primary text-primary-foreground">
  Custom Theme Button
</Button>

// Focus ring (automatisk themed)
<Input className="focus:ring-ring" />

// Accent background (automatisk themed)
<div className="bg-accent text-accent-foreground">
  Accent Content
</div>
```

### Check Om Theme Er Aktiv

```javascript
// I component
const hasCustomTheme = document.body.classList.contains('custom-theme-active');
```

## 🎓 Best Practices

1. **Test i Både Light og Dark Mode:**
   - Vælg farver der fungerer i begge modes
   - Test kontrast i begge themes

2. **Accessibility:**
   - Sikr minimum 4.5:1 kontrast ratio
   - Test med farveblindhed simulatorer

3. **Branding Consistency:**
   - Match primary color med logo og brand
   - Brug samme farve i widgets og platform

4. **Performance:**
   - Theme applies øjeblikkeligt (ingen page reload)
   - CSS variables er hurtige og effektive

## ✅ Testing Checklist

- [ ] Custom theme toggle virker
- [ ] Primary color opdateres korrekt
- [ ] Farver anvendes på hele platformen
- [ ] Kontrast er læsbar i light mode
- [ ] Kontrast er læsbar i dark mode
- [ ] Theme deaktiverer korrekt
- [ ] Default colors returnerer efter deaktivering
- [ ] Gemmes korrekt i database
- [ ] Fungerer på tværs af sessions
- [ ] Console.log viser korrekte theme events

## 🔧 Installation & Setup

### For Eksisterende Installationer

Hvis du opdaterer fra en ældre version, skal du køre følgende migration:

```bash
node scripts/update-org-schema-custom-theme.js
```

Dette script:
- Opdaterer MongoDB schema validation
- Tilføjer `useCustomTheme: false` til eksisterende organizations
- Verificerer at alle organizations er opdateret

### Schema Validation Error

Hvis du får en "Document failed validation" fejl ved opdatering af organizations:

1. Kør migration scriptet: `node scripts/update-org-schema-custom-theme.js`
2. Verificer at alle organizations har `useCustomTheme` feltet
3. Prøv at gemme igen

## 🐛 Known Issues

*Ingen kendte issues på nuværende tidspunkt.*

---

**Forfatter:** Elva Platform Team  
**Version:** 1.0.0  
**Sidste Opdatering:** Oktober 17, 2025

