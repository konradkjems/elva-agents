import WidgetShowcaseBase from './WidgetShowcaseBase.jsx';

const conversation = [
  {
    id: 'assistant-1',
    sender: 'assistant',
    text: 'Hej! 👋 Upload et billede, så analyserer jeg det og giver dig anbefalinger på få sekunder.',
    delay: 600,
  },
  {
    id: 'user-1',
    sender: 'user',
    text: 'Kan du se hvilket produkt jeg bruger?',
    delay: 1200,
  },
  {
    id: 'assistant-2',
    sender: 'assistant',
    text: 'Selvfølgelig – upload billedet, så matcher jeg det med vores katalog og foreslår kompatible upgrades.',
    delay: 1300,
  },
  {
    id: 'user-image',
    type: 'image',
    sender: 'user',
    caption: 'Uploadet billede: nuværende kaffemaskine i butikken.',
    delay: 1500,
    image: {
      src: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=420&q=80',
      alt: 'Kaffemaskine på et bord',
    },
  },
  {
    id: 'assistant-3',
    sender: 'assistant',
    text: 'Det ligner en Barista Classic fra 2019-serien. Jeg anbefaler en Elva Brew Pro – den passer til dine eksisterende filtre og reducerer energiforbruget med 18%.',
    delay: 1400,
  },
  {
    id: 'assistant-4',
    sender: 'assistant',
    text: 'Vil du have en hurtig sammenligning eller skal jeg sende linket direkte til checkout?',
    delay: 3000,
  },
];

export default function ImageUploadShowcase(props) {
  return (
    <WidgetShowcaseBase
      badgeText="Billedeforståelse"
      assistantName="Elva Vision Assistant"
      description="Demonstrér hvordan kunder kan uploade billeder, hvorefter widgetten genkender produktet og foreslår relevante next steps."
      conversation={conversation}
      {...props}
    />
  );
}


