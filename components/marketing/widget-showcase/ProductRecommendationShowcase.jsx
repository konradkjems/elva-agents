import WidgetShowcaseBase from './WidgetShowcaseBase.jsx';

const conversation = [
  {
    id: 'assistant-1',
    sender: 'assistant',
    text: 'Hej 👋 Jeg er her for at hjælpe dig med at finde det helt rigtige produkt. Hvad leder du efter i dag?',
    delay: 600,
  },
  {
    id: 'user-1',
    sender: 'user',
    text: 'Jeg leder efter en smart kaffemaskine',
    delay: 1000,
  },
  {
    id: 'assistant-2',
    sender: 'assistant',
    text: 'Perfekt match! Jeg har fundet tre produkter, der passer til dine behov – inklusiv smarte workflows og lagerstatus fra Shopify.',
    delay: 1400,
  },
  {
    id: 'products-1',
    type: 'products',
    heading: 'Udvalgte anbefalinger til dig',
    footer: 'Alle produkter er i lager og kan konfigureres med automatiske flows direkte fra widgetten.',
    delay: 2400,
    products: [
      {
        id: 'brew-pro',
        name: 'Elva Brew Pro',
        description: 'Automatisk mælkeskum, 34 opskrifter og synkronisering med din kundeklub.',
        price: '1.999 kr.',
        tag: 'Mest valgt',
        cta: 'Se detaljer',
        fallback: 'EP',
        mediaColor: 'linear-gradient(135deg, rgba(23,91,250,0.18), rgba(23,91,250,0.2))',
        image: '/images/Elva Brew Pro.png',
      },
      {
        id: 'smart-pour',
        name: 'Smart Pour X',
        description: 'Stemmestyring via Elva og automatisk påmindelse, når brygningen er færdig.',
        price: '2.499 kr.',
        cta: 'Tilføj til kurv',
        fallback: 'SP',
        mediaColor: 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(45,212,191,0.2))',
        image: '/images/smart-pour-x.png',
      },
      {
        id: 'micro-roast',
        name: 'Micro Roast Mini',
        description: 'Kompakt løsning med egen mikro-rister og forudsigende lagerstatus.',
        price: '1.399 kr.',
        cta: 'Book demo',
        fallback: 'MR',
        mediaColor: 'linear-gradient(135deg, rgba(244,114,182,0.18), rgba(59,130,246,0.18))',
        image: '/images/micro-roast-mini.png',
      },
    ],
  },
  {
    id: 'assistant-3',
    sender: 'assistant',
    text: 'Sig til, hvis du vil have dem leveret i sort eller champagnefarvet – jeg kan klare bestillingen direkte her i chatten.',
    delay: 1400,
  },
  {
    id: 'user-2',
    sender: 'user',
    text: 'Den første i sort tak',
    delay: 1100,
  },
  {
    id: 'assistant-4',
    sender: 'assistant',
    text: 'Fantastisk! Jeg reserverer en Elva Brew Pro i sort og sender straks en bekræftelse. Skal vi også aktivere servicemeddelelser?',
    delay: 1100,
  },
];

export default function ProductRecommendationShowcase(props) {
  return (
    <WidgetShowcaseBase
      badgeText="Produkt anbefaling"
      assistantName="Elva Shopping Assistant"
      description="Vis kunderne hvordan AI-widgetten leverer hyper-personlige produktforslag med live data fra jeres ecommerce stack."
      conversation={conversation}
      {...props}
    />
  );
}


