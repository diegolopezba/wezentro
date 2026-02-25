import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Santa Cruz de la Sierra coordinates (center)
const SCZ_LAT = -17.7833;
const SCZ_LNG = -63.1821;

// Neighborhoods spread
const neighborhoods = [
  { name: "Equipetrol", lat: -17.7657, lng: -63.1942 },
  { name: "Casco Viejo", lat: -17.7943, lng: -63.1810 },
  { name: "Las Palmas", lat: -17.7700, lng: -63.1750 },
  { name: "Urubó", lat: -17.7200, lng: -63.2400 },
  { name: "Hamacas", lat: -17.8050, lng: -63.1600 },
  { name: "Villa 1ro de Mayo", lat: -17.8200, lng: -63.1500 },
  { name: "Av. San Martín", lat: -17.7800, lng: -63.2000 },
  { name: "Barrio Lindo", lat: -17.7500, lng: -63.1850 },
];

// Curated Unsplash image pools per category (stable IDs)
const images = {
  cafe: [
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&q=80",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80",
    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&q=80",
    "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=200&q=80",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200&q=80",
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&q=80",
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&q=80",
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=200&q=80",
    "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=200&q=80",
    "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=200&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80",
    "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=200&q=80",
    "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=200&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=200&q=80",
    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&q=80",
    "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&q=80",
    "https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=200&q=80",
    "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?w=200&q=80",
    "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=200&q=80",
    "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=200&q=80",
    "https://images.unsplash.com/photo-1546077760-b284f7d09e52?w=200&q=80",
    "https://images.unsplash.com/photo-1485182708500-e8f1f318ba72?w=200&q=80",
    "https://images.unsplash.com/photo-1519923834699-ef0b7aea8b4c?w=200&q=80",
    "https://images.unsplash.com/photo-1510627489930-0c1b0bfb6785?w=200&q=80",
    "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=200&q=80",
    "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=200&q=80",
    "https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=200&q=80",
    "https://images.unsplash.com/photo-1511081692775-05d0f180a065?w=200&q=80",
    "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=200&q=80",
  ],
  brunch: [
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=200&q=80",
    "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=200&q=80",
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=200&q=80",
    "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=200&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80",
    "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=200&q=80",
    "https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=200&q=80",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=200&q=80",
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=200&q=80",
  ],
  restaurant: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80",
    "https://images.unsplash.com/photo-1552566626-52f8b828329f?w=200&q=80",
    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=200&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200&q=80",
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=200&q=80",
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&q=80",
    "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=200&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80",
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=200&q=80",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80",
    "https://images.unsplash.com/photo-1574484284002-952d92456975?w=200&q=80",
    "https://images.unsplash.com/photo-1559847844-5315695dadae?w=200&q=80",
    "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&q=80",
    "https://images.unsplash.com/photo-1560684352-8497838a2229?w=200&q=80",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&q=80",
  ],
  sushi: [
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200&q=80",
    "https://images.unsplash.com/photo-1617196034234-4a73a4f10f2d?w=200&q=80",
    "https://images.unsplash.com/photo-1617196034096-79e359e447ad?w=200&q=80",
    "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=200&q=80",
    "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=200&q=80",
  ],
  pizza: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=80",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&q=80",
    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&q=80",
  ],
  burger: [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&q=80",
    "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=200&q=80",
  ],
  bar: [
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=200&q=80",
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=200&q=80",
    "https://images.unsplash.com/photo-1470338745628-171cf53de3a8?w=200&q=80",
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&q=80",
    "https://images.unsplash.com/photo-1543218024-57a70143c369?w=200&q=80",
  ],
  healthy: [
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&q=80",
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=200&q=80",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=200&q=80",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&q=80",
  ],
  rooftop: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&q=80",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=200&q=80",
    "https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=200&q=80",
    "https://images.unsplash.com/photo-1561501878-aabd62634533?w=200&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=200&q=80",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=200&q=80",
  ],
};

// Event cover images per category
const eventImages = {
  cafe: [
    "https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=800&q=80",
    "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80",
  ],
  bar: [
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=800&q=80",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
  ],
  restaurant: [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
  ],
  nightlife: [
    "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&q=80",
    "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=800&q=80",
    "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&q=80",
  ],
};

// Business data
const businesses = [
  // Burgers
  { name: "El Beber Burger", username: "elbeberburger", type: "burger", imgCat: "burger", businessType: "Restaurante", isFoodBusiness: true, bio: "Las mejores hamburguesas artesanales de Santa Cruz. Ingredientes frescos, sabor inigualable." },
  { name: "Hito", username: "hito_scz", type: "burger", imgCat: "burger", businessType: "Restaurante", isFoodBusiness: true, bio: "Burger gourmet con papas fritas caseras y salsas secretas. Un hito en SCZ." },
  { name: "Punto", username: "punto_burgers", type: "burger", imgCat: "burger", businessType: "Restaurante", isFoodBusiness: true, bio: "Punto de encuentro para los amantes de la buena hamburguesa." },

  // Bars/Nightlife
  { name: "La Happy Hour", username: "lahappyhour", type: "bar", imgCat: "bar", businessType: "Bar", isFoodBusiness: false, bio: "Happy hour todos los días de 6 a 9pm. Cócteles, shots y la mejor música." },
  { name: "Noi", username: "noi_bar", type: "bar", imgCat: "bar", businessType: "Bar", isFoodBusiness: false, bio: "Bar de autor con tragos creativos y ambiente íntimo en Equipetrol." },
  { name: "Lorca", username: "lorca_scz", type: "bar", imgCat: "bar", businessType: "Bar", isFoodBusiness: false, bio: "Inspirado en Federico García Lorca. Poesía, vino y buena conversación." },
  { name: "Callejxn", username: "callejxn", type: "bar", imgCat: "bar", businessType: "Bar", isFoodBusiness: false, bio: "El callejón más cool de Santa Cruz. Música en vivo y tragos." },
  { name: "Rokani", username: "rokani_bar", type: "bar", imgCat: "bar", businessType: "Bar", isFoodBusiness: false, bio: "Rock y cócteles. El lugar perfecto para la noche del viernes." },

  // Cafés (30 total)
  { name: "Cafe 4 Llamas", username: "cafe4llamas", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Café de especialidad con granos bolivianos de altura. Ambiente acogedor en el corazón de SCZ." },
  { name: "Pekelicious Cafe", username: "pekeliciouscafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Pequeño y delicioso. Café artesanal, postres caseros y buenas vibras." },
  { name: "Patio Colonial Cafe", username: "patiocolonialcafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Un patio con historia. Café de especialidad en un ambiente colonial único." },
  { name: "Sitcom Cafe", username: "sitcomcafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Como en tu serie favorita. Café, sándwiches y mucho humor." },
  { name: "Buen Dia", username: "buendia_cafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "El mejor comienzo para tu día. Desayunos completos y café de primera." },
  { name: "Cafe Jardin", username: "cafejardin", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Un jardín de sabores. Café rodeado de naturaleza y tranquilidad." },
  { name: "Varea Coffees", username: "vareacoffees", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Specialty coffee con métodos de preparación únicos. Pasión por el café boliviano." },
  { name: "Astemisa Coffee Bar", username: "astemisacoffee", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Coffee bar moderno con una selección curada de cocteles de café." },
  { name: "Cafe Buena Vista", username: "cafebuenavista", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Vista y sabor inigualables. Café con terraza y las mejores vistas de SCZ." },
  { name: "Cofi", username: "cofi_scz", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Simple. Rico. Cofi. Café minimalista con máximo sabor." },
  { name: "Typica", username: "typica_coffee", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Variedad Typica boliviana. Terruño, taza limpia y sabor excepcional." },
  { name: "Casa Cero", username: "casacero_cafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Donde todo empieza. Café de especialidad en un espacio de diseño." },
  { name: "Pineapple Tea", username: "pineappletea", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Tés, infusiones y cafés tropicales. Refrescante y único." },
  { name: "Alquimia Specialty Coffee", username: "alquimiacoffee", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "La alquimia del café perfecto. Especialidad, ciencia y pasión en cada taza." },
  { name: "Alto Tostado Coffee Roast", username: "altotostado", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Tostamos nuestros propios granos. Del origen a la taza, controlamos cada paso." },
  { name: "Lumina Cafe", username: "luminacafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Ilumina tu día con el mejor café de especialidad y pastelería artesanal." },
  { name: "Veinticuatro Coffee", username: "veinticuatro_coffee", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "24 horas de café. Siempre abiertos para los que necesitan su dosis cafeína." },
  { name: "Tostado Cafe", username: "tostadocafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "El arte del tostado en cada sorbo. Café boliviano de origen." },
  { name: "Ame Cafe & Bar", username: "amecafebar", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Café de día, bar de noche. El lugar que se adapta a tu momento." },
  { name: "Cornerstone Cafe Bistro", username: "cornerstonecafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "La piedra angular de tu mañana. Bistro con café de especialidad y platos del día." },
  { name: "L'arome", username: "larome_cafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "El aroma del buen café. Gastronomía francesa con café de especialidad." },
  { name: "Rue 170 Cafe Bistro", username: "rue170", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Un pedacito de París en Santa Cruz. Café, croissants y ambiente parisino." },
  { name: "Gout Bakery", username: "goutbakery", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Panadería artesanal con café de especialidad. Pan fresco cada mañana." },
  { name: "Sir Francis", username: "sirfrancis_scz", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Cafetería con estilo británico. High tea, scones y los mejores cafés." },
  { name: "Bruko", username: "bruko_cafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Espacio creativo y café. Donde los artistas y trabajadores creativos se encuentran." },
  { name: "Emilia", username: "emilia_cafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Café con alma italiana. Espressos perfectos y ambiente familiar." },
  { name: "Dinona", username: "dinona_scz", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Donde la conversación fluye con el café. Ambiente íntimo y acogedor." },
  { name: "Irish Pub", username: "irishpub_scz", type: "cafe", imgCat: "cafe", businessType: "Bar", isFoodBusiness: true, bio: "Un auténtico pub irlandés en el corazón de SCZ. Cervezas importadas y buena comida." },
  { name: "Autoria Signature", username: "autoria_scz", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Café de autor. Cada taza cuenta una historia única." },

  // Brunch & Bar
  { name: "Bonita Brunch & Bar", username: "bonitabrunch", type: "brunch", imgCat: "brunch", businessType: "Restaurante", isFoodBusiness: true, bio: "Brunch con onda y cócteles de autor. El domingo perfecto en Santa Cruz." },
  { name: "Kardinia Brunch and Coffee", username: "kardinia_scz", type: "brunch", imgCat: "brunch", businessType: "Café", isFoodBusiness: true, bio: "Brunch australiano con café de especialidad. Avocado toast y flat whites." },
  { name: "Mediterraneo Brunch y Tapas", username: "mediterraneo_scz", type: "brunch", imgCat: "brunch", businessType: "Restaurante", isFoodBusiness: true, bio: "Sabores del mediterráneo. Brunch, tapas y buenos vinos en un ambiente cálido." },
  { name: "Sir Pieper Resto Bar", username: "sirpieper", type: "brunch", imgCat: "brunch", businessType: "Bar", isFoodBusiness: true, bio: "Resto bar con menú ecléctico. Desde brunch hasta cena, siempre con estilo." },
  { name: "Beer Station", username: "beerstation_scz", type: "brunch", imgCat: "bar", businessType: "Bar", isFoodBusiness: false, bio: "La estación de la cerveza artesanal. Más de 20 variedades en grifo." },
  { name: "Botanica", username: "botanica_scz", type: "brunch", imgCat: "brunch", businessType: "Bar", isFoodBusiness: true, bio: "Coctelería botánica con ingredientes frescos y naturales. Garden vibes." },
  { name: "Kaos", username: "kaos_scz", type: "brunch", imgCat: "bar", businessType: "Bar", isFoodBusiness: false, bio: "El caos organizado más divertido de SCZ. Bar con eventos y música." },
  { name: "Dossier Bistro", username: "dossierbistro", type: "brunch", imgCat: "brunch", businessType: "Restaurante", isFoodBusiness: true, bio: "Bistro urbano con cocina de autor. Ingredientes locales, técnica internacional." },
  { name: "Gallon Negro", username: "gallonnegro", type: "brunch", imgCat: "bar", businessType: "Bar", isFoodBusiness: false, bio: "Speakeasy bar con cócteles clásicos y jazz en vivo los jueves." },
  { name: "Aviator", username: "aviator_scz", type: "brunch", imgCat: "bar", businessType: "Bar", isFoodBusiness: false, bio: "Elevate your night. Bar temático aviación con cócteles de altura." },

  // Restaurants
  { name: "La Recoleta", username: "larecoleta_scz", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Cocina boliviana contemporánea. Los sabores de nuestra tierra, reinventados." },
  { name: "Fogon del Gringo", username: "fogondelgringo", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Parrilla al estilo americano con toques locales. Carnes y costillas irresistibles." },
  { name: "La Gaira", username: "lagaira_scz", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Inspirados en La Gaira venezolana. Sabores caribeños en Santa Cruz." },
  { name: "Elsa Restaurante", username: "elsarestaurante", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Cocina de autor con alma local. La creatividad en el plato." },
  { name: "Sonnngarten Restaurante", username: "sonnngarten", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Jardín de sol. Restaurante alemán-boliviano con terraza y cerveza artesanal." },
  { name: "As de Copas", username: "asdecopas", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "El as de la gastronomía cruceña. Cocina clásica con la mejor selección de vinos." },
  { name: "Tagliatella", username: "tagliatella_scz", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Pasta fresca hecha a mano todos los días. Auténtica cocina italiana en SCZ." },
  { name: "Republica", username: "republica_scz", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Cocina latinoamericana contemporánea. Un tributo a los sabores de la región." },
  { name: "El Cuartito", username: "elcuartito", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Pequeño en espacio, grande en sabor. Cocina casera con recetas de abuela." },
  { name: "La Tranquera", username: "latranquera", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Parrilla argentina. El asado más auténtico de Santa Cruz." },
  { name: "Fogo de Chao", username: "fogodechao_scz", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Churrascaria brasileña. Cortes premium en espada, servidos a la mesa." },
  { name: "La Cabrera", username: "lacabrera_scz", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "El legendario bife de chorizo porteño llega a Santa Cruz." },
  { name: "Vaca Morena", username: "vacamorena", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Especialistas en carnes. La vaca más sabrosa de toda la ciudad." },
  { name: "Tinto Carnes & Vinos", username: "tintocarnes", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Maridaje perfecto: carnes a la brasa y vinos de autor." },
  { name: "Muelle 18", username: "muelle18", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Cocina de mar en tierra firme. Mariscos frescos y ceviche al estilo peruano." },
  { name: "Ottimo", username: "ottimo_scz", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Ottimo! Como se dice en italiano. Cocina mediterránea auténtica y exquisita." },
  { name: "Casacuina", username: "casacuina", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Casa de cocina. Comida casera boliviana con el toque moderno." },
  { name: "De Castilla", username: "decastilla_scz", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Cocina española auténtica. Tapas, paella y vinos de la Península Ibérica." },
  { name: "El Gallo Frances", username: "elgallofrances", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Gastronomía francesa en Bolivia. Elegancia y tradición culinaria." },
  { name: "Brunello Trattoria", username: "brunellotrattoria", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Trattoria toscana. Pasta, risotto y el mejor tiramisú al este del Atlántico." },

  // Sushi
  { name: "Shimaya", username: "shimaya_scz", type: "sushi", imgCat: "sushi", businessType: "Restaurante", isFoodBusiness: true, bio: "Sushi de alta calidad con ingredientes frescos importados. Omakase disponible." },
  { name: "New Tokyo", username: "newtokyo_scz", type: "sushi", imgCat: "sushi", businessType: "Restaurante", isFoodBusiness: true, bio: "El sabor de Tokio en Santa Cruz. Ramen, sushi y más cocina japonesa." },
  { name: "Naoki Sushi", username: "naokisushi", type: "sushi", imgCat: "sushi", businessType: "Restaurante", isFoodBusiness: true, bio: "Maestro del sushi Naoki trae su arte a Bolivia. Rolls creativos y clásicos." },
  { name: "Hatorri", username: "hatorri_sushi", type: "sushi", imgCat: "sushi", businessType: "Restaurante", isFoodBusiness: true, bio: "Inspirados en el maestro espadachín. Cortes precisos, sabores perfectos." },
  { name: "Zenzoo Center", username: "zenzoocenter", type: "sushi", imgCat: "sushi", businessType: "Restaurante", isFoodBusiness: true, bio: "El centro del zen gastronómico. Sushi, wok y experiencias asiáticas." },

  // Pizza
  { name: "Pizzeria Firenze", username: "pizzeriafirenze", type: "pizza", imgCat: "pizza", businessType: "Restaurante", isFoodBusiness: true, bio: "Pizza napolitana al horno de leña. Masa madre, ingredientes italianos auténticos." },
  { name: "Vulcanica Pizzeria", username: "vulcanicapizzeria", type: "pizza", imgCat: "pizza", businessType: "Restaurante", isFoodBusiness: true, bio: "Pizzas volcánicamente deliciosas. Masa crujiente y coberturas generosas." },
  { name: "Santo Peccato", username: "santopeccato", type: "pizza", imgCat: "pizza", businessType: "Restaurante", isFoodBusiness: true, bio: "¡Pecado pero santo! Las pizzas más tentadoras de toda SCZ." },

  // Healthy
  { name: "Healthy by Jackie", username: "healthybyjackie", type: "healthy", imgCat: "healthy", businessType: "Restaurante", isFoodBusiness: true, bio: "Alimentación saludable sin sacrificar el sabor. Bowls, jugos y vida sana." },
  { name: "Keto Vicio", username: "ketovicio", type: "healthy", imgCat: "healthy", businessType: "Restaurante", isFoodBusiness: true, bio: "Tu vicio cetogénico. Comida keto deliciosa y baja en carbos." },
  { name: "Nativo Healthy Food", username: "nativohealthy", type: "healthy", imgCat: "healthy", businessType: "Restaurante", isFoodBusiness: true, bio: "Superalimentos bolivianos. Quinua, cacao y más ingredientes nativos en platos modernos." },
  { name: "The Fussion", username: "thefussion", type: "healthy", imgCat: "healthy", businessType: "Restaurante", isFoodBusiness: true, bio: "Fusión de lo saludable y lo delicioso. Cocina wellness con sabor." },

  // Rooftop/Upscale
  { name: "SBC Rooftop", username: "sbcrooftop", type: "rooftop", imgCat: "rooftop", businessType: "Bar", isFoodBusiness: false, bio: "Santa Cruz desde las alturas. Rooftop bar con vistas 360° y cócteles premium." },
  { name: "Biancaflor", username: "biancaflor", type: "rooftop", imgCat: "rooftop", businessType: "Restaurante", isFoodBusiness: true, bio: "Elegancia y sofisticación. Fine dining en el corazón de Equipetrol." },
  { name: "Noa", username: "noa_scz", type: "rooftop", imgCat: "rooftop", businessType: "Bar", isFoodBusiness: false, bio: "Bienvenidos al arca del buen gusto. Club y rooftop bar de lujo." },
  { name: "Bernadette", username: "bernadette_scz", type: "rooftop", imgCat: "rooftop", businessType: "Restaurante", isFoodBusiness: true, bio: "Restaurante íntimo de alta cocina. Experiencias gastronómicas memorables." },
  { name: "Mangarosa", username: "mangarosa_scz", type: "rooftop", imgCat: "rooftop", businessType: "Restaurante", isFoodBusiness: true, bio: "Rosa de mango. Cocina tropical de autor con una vista que enamora." },
  { name: "Habito Kitchen", username: "habitokitchen", type: "rooftop", imgCat: "rooftop", businessType: "Restaurante", isFoodBusiness: true, bio: "Hacer del buen comer un hábito. Cocina de mercado con ingredientes locales." },

  // Other/Mixed
  { name: "Steel Container Grill & Bar", username: "steelcontainer", type: "restaurant", imgCat: "restaurant", businessType: "Bar", isFoodBusiness: true, bio: "Industrial, auténtico y delicioso. Parrilla y bar en contenedores de acero." },
  { name: "Pinata Wey", username: "pinatawey", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Sabores mexicanos auténticos. Tacos, mezcal y mariachi los fines de semana." },
  { name: "Los Hierros", username: "loshierros", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Parrilla a las brasas. Carnes, chorizos y el mejor ambiente de asado." },
  { name: "Cornelia", username: "cornelia_scz", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Cocina contemporánea con espíritu cruceño. Menú de temporada y reservas." },
  { name: "El Arriero", username: "elarriero_scz", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Tradición ganadera en cada plato. El asado más tradicional de Bolivia." },
  { name: "Distinto", username: "distinto_scz", type: "restaurant", imgCat: "restaurant", businessType: "Restaurante", isFoodBusiness: true, bio: "Ser distinto es nuestra esencia. Cocina de fusión con identidad propia." },
  { name: "Simone Cafe", username: "simonecafe", type: "cafe", imgCat: "cafe", businessType: "Café", isFoodBusiness: true, bio: "Como en casa de Simone. Café, pasteles y recetas de familia." },
];

// Normal user accounts (50 Bolivian users)
const normalUsers = [
  { username: "rodrigo_vaca", fullName: "Rodrigo Vaca" },
  { username: "valentina_flores", fullName: "Valentina Flores" },
  { username: "andres_gutierrez", fullName: "Andrés Gutiérrez" },
  { username: "camila_suarez", fullName: "Camila Suárez" },
  { username: "mateo_paniagua", fullName: "Mateo Paniagua" },
  { username: "sofia_camacho", fullName: "Sofía Camacho" },
  { username: "sebastián_medina", fullName: "Sebastián Medina" },
  { username: "luciana_montero", fullName: "Luciana Montero" },
  { username: "miguel_pedraza", fullName: "Miguel Pedraza" },
  { username: "isabella_romero", fullName: "Isabella Romero" },
  { username: "juan_carlos_vega", fullName: "Juan Carlos Vega" },
  { username: "daniela_quispe", fullName: "Daniela Quispe" },
  { username: "nicolas_torrico", fullName: "Nicolás Torrico" },
  { username: "gabriela_mamani", fullName: "Gabriela Mamani" },
  { username: "alejandro_rojas", fullName: "Alejandro Rojas" },
  { username: "fernanda_choque", fullName: "Fernanda Choque" },
  { username: "emilio_condori", fullName: "Emilio Condori" },
  { username: "natalia_copa", fullName: "Natalia Copa" },
  { username: "franco_vargas", fullName: "Franco Vargas" },
  { username: "paola_salvatierra", fullName: "Paola Salvatierra" },
  { username: "diego_terceros", fullName: "Diego Terceros" },
  { username: "carla_serrudo", fullName: "Carla Serrudo" },
  { username: "martin_peñaranda", fullName: "Martín Peñaranda" },
  { username: "ana_paz", fullName: "Ana Paz" },
  { username: "pablo_mercado", fullName: "Pablo Mercado" },
  { username: "lorena_calderon", fullName: "Lorena Calderón" },
  { username: "oscar_mendoza", fullName: "Óscar Mendoza" },
  { username: "patricia_arce", fullName: "Patricia Arce" },
  { username: "julian_perez", fullName: "Julián Pérez" },
  { username: "monica_leigue", fullName: "Mónica Leigue" },
  { username: "roberto_veizaga", fullName: "Roberto Veizaga" },
  { username: "elena_ibañez", fullName: "Elena Ibáñez" },
  { username: "christian_uzquiano", fullName: "Christian Uzquiano" },
  { username: "gisela_taborga", fullName: "Gisela Taborga" },
  { username: "hector_antelo", fullName: "Héctor Antelo" },
  { username: "veronica_prada", fullName: "Verónica Prada" },
  { username: "esteban_vaca_diez", fullName: "Esteban Vaca Díez" },
  { username: "mariana_pereyra", fullName: "Mariana Pereyra" },
  { username: "ricardo_arancibia", fullName: "Ricardo Arancibia" },
  { username: "jessica_ortiz", fullName: "Jessica Ortiz" },
  { username: "gonzalo_banegas", fullName: "Gonzalo Banegas" },
  { username: "claudia_mariscal", fullName: "Claudia Mariscal" },
  { username: "ivan_saucedo", fullName: "Iván Saucedo" },
  { username: "silvia_rivera", fullName: "Silvia Rivera" },
  { username: "carlos_trigo", fullName: "Carlos Trigo" },
  { username: "andrea_coimbra", fullName: "Andrea Coimbra" },
  { username: "cesar_justiniano", fullName: "César Justiniano" },
  { username: "ruth_zabala", fullName: "Ruth Zabala" },
  { username: "joel_paredes", fullName: "Joel Paredes" },
  { username: "nancy_suñagua", fullName: "Nancy Suñagua" },
];

// Event templates per type
const eventTemplates: Record<string, Array<{title: string, description: string, category: string, isPost: boolean}>> = {
  cafe: [
    { title: "Open Mic Night ☕", description: "Noches de micrófono abierto con el mejor café. Músicos, poetas y artistas bienvenidos. Consumición mínima de café incluida.", category: "Arte y Cultura", isPost: false },
    { title: "Cata de Cafés de Especialidad", description: "Aprende a distinguir los sabores únicos del café boliviano. Guiados por nuestros baristas expertos. Cupos limitados.", category: "Gastronomía", isPost: false },
    { title: "Nueva Carta de Temporada 🍂", description: "Presentamos nuestra nueva carta de otoño con propuestas únicas de café, jugos y snacks. ¡Ven a probar las novedades!", category: "Gastronomía", isPost: true },
  ],
  bar: [
    { title: "Noche Latina 🔥", description: "Salsa, cumbia y los mejores cócteles de la ciudad. DJ en vivo, pista de baile y tragos 2x1 hasta la medianoche.", category: "Fiesta", isPost: false },
    { title: "Happy Hour 6-9pm", description: "Cócteles premium a mitad de precio. Gin tonics, mojitos y más. De lunes a jueves, ven a relajarte después del trabajo.", category: "Social", isPost: false },
    { title: "Nueva Carta de Cócteles 🍹", description: "Presentamos nuestra nueva colección de cócteles de temporada. Botanicals frescos, destilados premium y creatividad sin límites.", category: "Gastronomía", isPost: true },
  ],
  restaurant: [
    { title: "Cena Maridaje Vinos & Carnes", description: "Una experiencia gastronómica de 5 tiempos con maridaje de vinos seleccionados. Cupos muy limitados, reservas obligatorias.", category: "Gastronomía", isPost: false },
    { title: "Brunch de Domingo 🥞", description: "El mejor brunch de Santa Cruz. Buffet completo, mimosas ilimitadas y música en vivo. Domingos de 10am a 3pm.", category: "Social", isPost: false },
    { title: "Chef's Table Especial", description: "Menú degustación exclusivo del chef. 8 tiempos, ingredientes de temporada y la historia detrás de cada plato.", category: "Gastronomía", isPost: true },
  ],
  sushi: [
    { title: "Noche Japonesa 🎌", description: "Menú omakase especial con sake ilimitado. El chef preparará sus mejores creaciones frente a tus ojos.", category: "Gastronomía", isPost: false },
    { title: "All You Can Eat Sushi", description: "Sushi ilimitado por 2 horas. Más de 30 variedades de rolls y nigiris. Reserva tu mesa ahora.", category: "Gastronomía", isPost: false },
    { title: "Nuevo Menú Fusión Japonés-Boliviano 🍣", description: "Presentamos nuestra innovadora fusión entre la cocina japonesa y los sabores bolivianos. ¡Únicó en su clase!", category: "Gastronomía", isPost: true },
  ],
  pizza: [
    { title: "Noche de Pizza & Vino 🍕", description: "Pizzas napolitanas al horno de leña con vinos italianos seleccionados. Ambiente íntimo y deliciosa comida.", category: "Social", isPost: false },
    { title: "Nueva Pizza de Temporada", description: "Lanzamos nuestra pizza especial de temporada con ingredientes locales. ¡Primeros en probarla esta semana!", category: "Gastronomía", isPost: true },
  ],
  burger: [
    { title: "Burger Festival 🍔", description: "Una semana entera de burgers especiales. Cada día una nueva creación del chef. ¡No te pierdas ninguna!", category: "Gastronomía", isPost: false },
    { title: "Double Burger Wednesday", description: "Los miércoles: lleva 2 burgers al precio de 1. Válido todo el día. ¡El miércoles más delicioso de la semana!", category: "Social", isPost: true },
  ],
  brunch: [
    { title: "Brunch & Bottomless Mimosas 🥂", description: "El brunch más completo de SCZ con mimosas y Bloody Marys ilimitados. Sábados y domingos de 10am a 2pm.", category: "Social", isPost: false },
    { title: "Girls Brunch Sunday ☀️", description: "Una mañana especial dedicada a las chicas. Menú especial, photobooth y sorpresas. Reservas abiertas.", category: "Social", isPost: false },
    { title: "Nueva Carta de Brunch 🥑", description: "Avocado toast, eggs benedict y más nuevas opciones en nuestra carta de brunch actualizada. ¡Ven a probar!", category: "Gastronomía", isPost: true },
  ],
  healthy: [
    { title: "Taller de Alimentación Saludable", description: "Aprende a comer sano sin aburrirte. Taller práctico con degustación de platos saludables y recetas para llevar a casa.", category: "Bienestar", isPost: false },
    { title: "Detox Smoothie Challenge 🥤", description: "7 días de smoothies detox. Únete al reto y transforma tu alimentación. Kit de inicio disponible en el local.", category: "Bienestar", isPost: true },
  ],
  rooftop: [
    { title: "Sunset Rooftop Party 🌅", description: "El atardecer más espectacular de Santa Cruz. DJ set, cócteles premium y vistas 360°. Dress code smart casual.", category: "Fiesta", isPost: false },
    { title: "Rooftop Cinema Night 🎬", description: "Cine bajo las estrellas en el rooftop. Película, cócteles y el skyline de SCZ como telón de fondo.", category: "Arte y Cultura", isPost: false },
    { title: "VIP Rooftop Experience", description: "Una noche exclusiva en las alturas. Mesa VIP, bottle service y la mejor vista de la ciudad. Solo 20 mesas.", category: "Fiesta", isPost: false },
  ],
};

function getNeighborhood(index: number) {
  return neighborhoods[index % neighborhoods.length];
}

function getImageUrl(imgCat: string, index: number): string {
  const pool = images[imgCat as keyof typeof images] || images.restaurant;
  return pool[index % pool.length];
}

function getEventImageUrl(type: string, index: number): string {
  const pool = eventImages[type as keyof typeof eventImages] || eventImages.restaurant;
  return pool[index % pool.length];
}

function getFutureDate(daysFromNow: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Parse batch parameters from body
  const body = await req.json().catch(() => ({}));
  const startIndex: number = body.startIndex ?? 0;
  const batchSize: number = body.batchSize ?? 20;
  const seedType: string = body.seedType ?? 'businesses'; // 'businesses' or 'users'

  const results = { businesses: 0, users: 0, events: 0, menus: 0, errors: [] as string[], done: false, deleted: 0 };

  try {
    if (seedType === 'delete') {
      // ── DELETE ALL MOCK DATA ────────────────────────────────────────
      // Collect all mock usernames
      const bizUsernames = businesses.map(b => b.username);
      const userUsernames = normalUsers.map(u => u.username);
      const allUsernames = [...bizUsernames, ...userUsernames];

      // Get their profile IDs
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('username', allUsernames);

      const userIds = (profiles || []).map((p: any) => p.id);

      if (userIds.length > 0) {
        // Delete auth users (cascades to profiles via trigger)
        for (const uid of userIds) {
          await supabaseAdmin.auth.admin.deleteUser(uid);
        }
        results.deleted = userIds.length;
      }

      results.done = true;
      return new Response(JSON.stringify(results), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (seedType === 'users') {
      // ── SEED NORMAL USERS ───────────────────────────────────────
      const end = Math.min(startIndex + batchSize, normalUsers.length);
      for (let i = startIndex; i < end; i++) {
        const u = normalUsers[i];
        const email = `${u.username}@zentromock.com`;
        const avatar = `https://i.pravatar.cc/150?img=${(i % 70) + 1}`;

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: 'Zentro2025!',
          email_confirm: true,
          user_metadata: { username: u.username, full_name: u.fullName, avatar_url: avatar },
        });

        if (authError && !authError.message.includes('already been registered')) {
          results.errors.push(`User ${u.username}: ${authError.message}`);
          continue;
        }

        const uid = authData?.user?.id;
        if (!uid) continue;

        await supabaseAdmin.from('profiles').upsert({
          id: uid,
          username: u.username,
          full_name: u.fullName,
          avatar_url: avatar,
          city: 'Santa Cruz de la Sierra',
          is_business: false,
        }, { onConflict: 'id' });

        results.users++;
      }
      results.done = end >= normalUsers.length;

      return new Response(JSON.stringify({ success: true, ...results, nextIndex: end, total: normalUsers.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── SEED BUSINESSES ──────────────────────────────────────────
    const end = Math.min(startIndex + batchSize, businesses.length);
    for (let i = startIndex; i < end; i++) {
      const b = businesses[i];
      const email = `${b.username}@zentromock.com`;
      const avatar = getImageUrl(b.imgCat, i);
      const neighborhood = getNeighborhood(i);
      const lat = neighborhood.lat + (Math.random() - 0.5) * 0.02;
      const lng = neighborhood.lng + (Math.random() - 0.5) * 0.02;

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'Zentro2025!',
        email_confirm: true,
        user_metadata: {
          username: b.username,
          full_name: b.name,
          avatar_url: avatar,
        },
      });

      if (authError && !authError.message.includes('already been registered')) {
        results.errors.push(`Business ${b.name}: ${authError.message}`);
        continue;
      }

      const userId = authData?.user?.id;
      if (!userId) {
        // Try to find existing user
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('username', b.username)
          .single();
        if (!existing) continue;
      }

      const uid = userId || (await supabaseAdmin.from('profiles').select('id').eq('username', b.username).single()).data?.id;
      if (!uid) continue;

      // Upsert profile
      await supabaseAdmin.from('profiles').upsert({
        id: uid,
        username: b.username,
        full_name: b.name,
        avatar_url: avatar,
        bio: b.bio,
        city: 'Santa Cruz de la Sierra',
        is_business: true,
        is_food_business: b.isFoodBusiness,
        business_type: b.businessType,
        business_address: `${neighborhood.name}, Santa Cruz de la Sierra`,
        business_latitude: lat,
        business_longitude: lng,
        business_phone: `+591 ${Math.floor(60000000 + Math.random() * 9999999)}`,
        business_hours: 'Lun-Dom: 8:00-23:00',
        menu_enabled: b.isFoodBusiness,
        reservations_enabled: b.isFoodBusiness,
      }, { onConflict: 'id' });

      results.businesses++;

      // Create events
      const templates = eventTemplates[b.type] || eventTemplates.restaurant;
      for (let j = 0; j < Math.min(templates.length, 3); j++) {
        const tmpl = templates[j];
        const daysOffset = 3 + j * 7 + Math.floor(Math.random() * 5);
        const startHour = [19, 20, 21][j % 3];
        const { error: evtErr } = await supabaseAdmin.from('events').insert({
          creator_id: uid,
          title: tmpl.title,
          description: tmpl.description,
          category: tmpl.category,
          image_url: getEventImageUrl(b.type, j),
          location_name: `${b.name} — ${neighborhood.name}`,
          latitude: lat,
          longitude: lng,
          start_datetime: getFutureDate(daysOffset, startHour),
          end_datetime: getFutureDate(daysOffset, startHour + 3),
          is_public: true,
          is_business_event: true,
          is_post: tmpl.isPost,
          has_guestlist: !tmpl.isPost,
          price: tmpl.isPost ? 0 : [0, 50, 80, 100][j % 4],
        });
        if (!evtErr) results.events++;
      }

      // Create menu for food businesses
      if (b.isFoodBusiness) {
        const { data: menuData } = await supabaseAdmin.from('menus').upsert(
          { user_id: uid, name: `Menú ${b.name}` },
          { onConflict: 'user_id' }
        ).select('id').single();

        if (menuData?.id) {
          const menuItems = getMenuItems(b.type);
          for (const item of menuItems) {
            await supabaseAdmin.from('menu_categories').upsert(
              { menu_id: menuData.id, name: item.category, display_order: item.catOrder },
              { onConflict: 'id' }
            );
          }
          results.menus++;
        }
      }
    }

    results.done = end >= businesses.length;

    return new Response(JSON.stringify({ success: true, ...results, nextIndex: end, total: businesses.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err), ...results }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getMenuItems(type: string) {
  const menus: Record<string, Array<{category: string, catOrder: number}>> = {
    cafe: [
      { category: "Cafés & Bebidas Calientes", catOrder: 0 },
      { category: "Bebidas Frías", catOrder: 1 },
      { category: "Desayunos & Snacks", catOrder: 2 },
      { category: "Pasteles & Postres", catOrder: 3 },
    ],
    burger: [
      { category: "Burgers Clásicas", catOrder: 0 },
      { category: "Burgers Especiales", catOrder: 1 },
      { category: "Acompañamientos", catOrder: 2 },
      { category: "Bebidas", catOrder: 3 },
    ],
    sushi: [
      { category: "Rolls Clásicos", catOrder: 0 },
      { category: "Rolls Especiales", catOrder: 1 },
      { category: "Nigiris & Sashimi", catOrder: 2 },
      { category: "Entradas", catOrder: 3 },
      { category: "Bebidas", catOrder: 4 },
    ],
    pizza: [
      { category: "Pizzas Clásicas", catOrder: 0 },
      { category: "Pizzas Especiales", catOrder: 1 },
      { category: "Entradas", catOrder: 2 },
      { category: "Postres", catOrder: 3 },
    ],
    restaurant: [
      { category: "Entradas", catOrder: 0 },
      { category: "Platos Principales", catOrder: 1 },
      { category: "Guarniciones", catOrder: 2 },
      { category: "Postres", catOrder: 3 },
      { category: "Bebidas", catOrder: 4 },
    ],
    bar: [
      { category: "Cócteles de Autor", catOrder: 0 },
      { category: "Cócteles Clásicos", catOrder: 1 },
      { category: "Cervezas", catOrder: 2 },
      { category: "Picadas", catOrder: 3 },
    ],
    brunch: [
      { category: "Brunch Salado", catOrder: 0 },
      { category: "Brunch Dulce", catOrder: 1 },
      { category: "Cócteles de Brunch", catOrder: 2 },
      { category: "Jugos & Smoothies", catOrder: 3 },
    ],
    healthy: [
      { category: "Bowls", catOrder: 0 },
      { category: "Ensaladas", catOrder: 1 },
      { category: "Smoothies & Jugos", catOrder: 2 },
      { category: "Snacks Saludables", catOrder: 3 },
    ],
    rooftop: [
      { category: "Cócteles Premium", catOrder: 0 },
      { category: "Tapas & Snacks", catOrder: 1 },
      { category: "Botellas & Champagne", catOrder: 2 },
    ],
  };
  return menus[type] || menus.restaurant;
}
