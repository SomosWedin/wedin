import type { TermsDocument } from './types'

export const GUEST_TERMS: TermsDocument = {
  title: 'Términos y Condiciones de Uso',
  audience: 'Invitados',
  version: '2026-08-30',
  updatedAt: '30 de agosto de 2026',
  effectiveFrom: 'Vigencia: desde su publicación en somoswedin.com',
  sections: [
    {
      heading: 'Sección 1 — Información general y aceptación',
      blocks: [
        {
          type: 'paragraph',
          text: 'Los términos “wedin”, “nosotros”, “nos” y “nuestro” se refieren a **TEODORO E.A.S.**, RUC N° **80175973-0**, con domicilio en Teodoro S. Mongelós 3685, barrio Mburicaó, Asunción, República del Paraguay, titular y operadora de la plataforma digital disponible en **somoswedin.com** (los “**Servicios**”).',
        },
        {
          type: 'paragraph',
          text: 'Los términos “usted” o “**Invitado**” se refieren a la persona que accede a una lista de regalos publicada en wedin (la “**Lista**”) y realiza un pago asociado a uno de sus regalos.',
        },
        {
          type: 'paragraph',
          text: 'El “**Organizador**” es la persona o personas titulares y beneficiarias de la Lista: los novios en un casamiento, el o la agasajada en un cumpleaños o quince años, quien organiza un baby shower, o quien organice cualquier otra celebración (el “**Evento**”).',
        },
        {
          type: 'paragraph',
          text: 'Al realizar un pago a través de wedin, usted declara haber leído, comprendido y aceptado estos Términos y Condiciones (los “**Términos**”) y nuestra Política de Privacidad. Si no está de acuerdo, no debe completar la operación.',
        },
        {
          type: 'paragraph',
          text: '**No necesita crear una cuenta ni registrarse** para regalar a través de wedin.',
        },
      ],
    },
    {
      heading:
        'Sección 2 — Qué es lo que usted está haciendo (cláusula esencial)',
      blocks: [
        {
          type: 'paragraph',
          text: '2.1. **wedin no es una tienda.** wedin es una plataforma tecnológica que permite a los Organizadores crear listas de regalos digitales y que sus invitados les hagan llegar el valor en dinero de esos regalos, a través de la procesadora de pagos habilitada. wedin **no vende, no fabrica, no importa, no almacena, no distribuye y no entrega bienes físicos de ninguna clase**.',
        },
        {
          type: 'paragraph',
          text: '2.2. **Su pago es un aporte en dinero a favor del Organizador.** Al elegir un regalo de la Lista y abonarlo, usted está realizando **un regalo en dinero al Organizador**, asociado simbólicamente al regalo que eligió. El nombre, la imagen, la descripción y el valor del regalo cumplen una función **exclusivamente referencial**: le permiten identificar y expresar la intención de su regalo.',
        },
        {
          type: 'paragraph',
          text: '2.3. **El Organizador recibe dinero, no el bien.** Usted reconoce y acepta expresamente que **el Organizador recibirá el valor monetario del regalo que usted eligió, y no el bien físico** cuyo nombre o imagen figure en él. El Organizador podrá disponer libremente de ese dinero y destinarlo a lo que considere prioritario.',
        },
        {
          type: 'paragraph',
          text: '**Ejemplo aclaratorio:** si usted elige un regalo con un valor de Gs. 100.000 y lo abona, **wedin no comprará ni entregará el objeto** cuyo nombre figure en ese regalo. Se registrarán Gs. 100.000 a favor del Organizador (menos la comisión que wedin le cobra a él), para ser transferidos a su cuenta bancaria, y él decidirá en qué utilizar ese dinero.',
        },
        {
          type: 'paragraph',
          text: '2.4. **Lo que su pago NO implica.** Salvo indicación expresa en contrario, su pago **no constituye ni implica**: (a) la compraventa de un producto; (b) la reserva física de una unidad determinada; (c) la transferencia de propiedad de bien alguno a su favor o a favor del Organizador; (d) la entrega de un producto en ningún momento; ni (e) garantía, servicio técnico, cambio o devolución de mercadería de ningún tipo.',
        },
        {
          type: 'paragraph',
          text: '2.5. **Marcas de terceros.** Los nombres, marcas e imágenes de productos que puedan aparecer en una Lista son utilizados con fines meramente ilustrativos y referenciales. Su presencia no implica relación comercial, patrocinio, aval, distribución ni asociación alguna entre wedin y los titulares de dichas marcas.',
        },
        {
          type: 'paragraph',
          text: '2.6. **Contenido de la Lista.** Los regalos, sus nombres, imágenes, descripciones y valores son definidos exclusivamente por el Organizador. wedin no verifica ni garantiza la exactitud, razonabilidad o correspondencia con precios de mercado de los valores asignados por el Organizador a los regalos de su Lista.',
        },
      ],
    },
    {
      heading: 'Sección 3 — Precio, cargo por servicio y forma de pago',
      blocks: [
        {
          type: 'paragraph',
          text: '3.1. **Cargo por servicio.** Sobre el valor del regalo que usted elige se adiciona un **cargo por servicio del tres por ciento (3%)**. Este cargo se aplica **cualquiera sea el medio de pago que utilice** —tarjeta de crédito, tarjeta de débito, transferencia bancaria u otros— y se muestra de forma desglosada en el checkout, antes de que usted confirme el pago.',
        },
        { type: 'paragraph', text: '3.2. **Ejemplo.**' },
        {
          type: 'table',
          head: ['Concepto', 'Monto'],
          rows: [
            ['Valor del regalo elegido', 'Gs. 100.000'],
            ['Cargo por servicio wedin (3%)', 'Gs. 3.000'],
            ['Total a abonar por usted', 'Gs. 103.000'],
            ['Monto que se asocia al regalo del Organizador', 'Gs. 100.000'],
          ],
        },
        {
          type: 'paragraph',
          text: '3.3. El cargo por servicio del 3% retribuye el uso de la plataforma y el procesamiento del pago. **No se descuenta del regalo**: el Organizador recibe el valor íntegro del regalo, sujeto únicamente a la comisión que wedin le cobra a él y que se rige por los Términos aplicables a Organizadores.',
        },
        {
          type: 'paragraph',
          text: '3.4. **Medios de pago.** Los pagos son procesados por la o las procesadoras de pago habilitadas por wedin en cada momento, cuya identidad se informa durante el proceso de pago. Podrá abonar mediante tarjeta de crédito o débito, transferencia bancaria u otros medios habilitados, nacionales o internacionales, a la vista o en cuotas, según la disponibilidad vigente. Las condiciones, intereses, cuotas y costos financieros aplicables son determinados por su entidad emisora y son ajenos a wedin.',
        },
        {
          type: 'paragraph',
          text: '3.5. **Moneda.** Las operaciones se expresan y liquidan en Guaraníes (Gs.). Si usted abona con un medio de pago emitido en el exterior, el tipo de cambio y los cargos aplicables son determinados por su emisor.',
        },
        {
          type: 'paragraph',
          text: '3.6. **Seguridad.** wedin no almacena los datos completos de su tarjeta. La captura y el procesamiento de esos datos se realizan en el entorno seguro de la procesadora de pagos.',
        },
        {
          type: 'paragraph',
          text: '3.7. **Confirmación.** Recibirá un comprobante de su operación en el correo electrónico que informe en el checkout. Es su responsabilidad informar una dirección de correo válida.',
        },
      ],
    },
    {
      heading: 'Sección 4 — Carácter definitivo del regalo y devoluciones',
      blocks: [
        {
          type: 'paragraph',
          text: '4.1. **Irrevocabilidad.** Una vez confirmado el pago, **el regalo es definitivo y no admite arrepentimiento ni devolución a solicitud del Invitado**, por tratarse de una liberalidad realizada voluntariamente a favor del Organizador y no de la adquisición de un producto o servicio a wedin. Le recomendamos verificar el monto y el destinatario antes de confirmar.',
        },
        {
          type: 'paragraph',
          text: '4.2. **Excepciones.** wedin analizará y, cuando corresponda, gestionará la devolución en los siguientes supuestos, siempre que se soliciten dentro de los **7 días corridos** de realizada la operación a **admin@somoswedin.com**:',
        },
        {
          type: 'list',
          items: [
            'a. **Duplicación de cobro** por una falla técnica de la plataforma o de la procesadora;',
            'b. **Cobro por un monto distinto** al confirmado por usted en el checkout;',
            'c. **Falla técnica comprobable** que haya impedido la correcta imputación del regalo a la Lista;',
            'd. **Uso no autorizado** de su medio de pago, debidamente denunciado.',
          ],
        },
        {
          type: 'paragraph',
          text: '4.3. **Devolución decidida por el Organizador.** El valor del regalo pertenece al Organizador desde que usted confirma el pago. **wedin no reembolsa ese valor con recursos propios ni está obligada a hacerlo**, y la decisión de devolverlo corresponde exclusivamente al Organizador.',
        },
        {
          type: 'paragraph',
          text: 'Si el Organizador decide devolver, wedin ejecutará la devolución con cargo al importe registrado a su favor. En ese caso usted recibirá el valor del regalo neto del cargo por servicio del 3% y de la comisión del 4,9%, por corresponder ambos a servicios ya prestados y a costos ya irrogados frente a la procesadora de pagos, salvo que el Organizador opte por absorberlos. El cargo por servicio del 3% retribuye el procesamiento y registro de su regalo, que se prestó efectivamente con independencia de que el Evento se celebre o no.',
        },
        {
          type: 'paragraph',
          text: '4.4. **Plazo de acreditación.** Las devoluciones aprobadas se acreditan al mismo medio de pago utilizado, dentro de los plazos que determine la procesadora y la entidad emisora, que pueden extenderse hasta **30 días** y son ajenos al control de wedin.',
        },
        {
          type: 'paragraph',
          text: '4.5. **Contracargos.** Si usted considera que existió un cobro indebido, le solicitamos contactarnos primero a **admin@somoswedin.com**. Los contracargos iniciados sin contacto previo pueden derivar en la reversión de un regalo legítimamente recibido por el Organizador y en perjuicios evitables para él.',
        },
      ],
    },
    {
      heading: 'Sección 5 — Relación entre Invitado y Organizador',
      blocks: [
        {
          type: 'paragraph',
          text: '5.1. **Alcance de la obligación de wedin frente a usted.** wedin le presta a usted un servicio concreto y acotado, retribuido con el cargo del 3%: procesar su pago, registrar el regalo a favor del Organizador correctamente y por el monto correcto, y poner su mensaje a disposición del Organizador. **Ese es el alcance de lo que wedin le debe a usted**, y responde por su cumplimiento conforme a la Sección 11.',
        },
        {
          type: 'paragraph',
          text: 'wedin **no es parte de la relación de regalo entre usted y el Organizador**, no es beneficiaria del regalo, no asume obligación alguna respecto de la celebración del Evento ni garantiza la conducta del Organizador.',
        },
        {
          type: 'paragraph',
          text: '5.2. **Realización del Evento.** wedin no garantiza que el Evento se celebre, ni en la fecha, lugar o forma anunciados. wedin no verifica la veracidad de la información publicada por el Organizador acerca de su Evento.',
        },
        {
          type: 'paragraph',
          text: '5.3. **Cancelación o postergación del Evento.** En caso de cancelación, postergación o modificación del Evento:',
        },
        {
          type: 'list',
          items: [
            'a. El regalo ya efectuado **permanece registrado a favor del Organizador**, salvo que este decida devolverlo conforme a la cláusula 4.3;',
            'b. wedin **no reembolsa el valor del regalo con recursos propios ni está obligada a hacerlo**, por no ser la destinataria de ese dinero;',
            'c. Todo reclamo relativo a la devolución del valor del regalo deberá dirigirse **al Organizador**, que es su destinatario. wedin podrá, a su criterio y a pedido de parte, facilitar la información transaccional que obre en su poder para colaborar en la resolución;',
            'd. Lo anterior no afecta los supuestos de la cláusula 4.2, en los que el reclamo sí corresponde a wedin por tratarse de fallas en el servicio que ella le presta a usted.',
          ],
        },
        {
          type: 'paragraph',
          text: '5.4. **Destino de los fondos.** wedin no supervisa, condiciona ni audita el uso que el Organizador dé al dinero recibido, ni asume responsabilidad alguna al respecto.',
        },
        {
          type: 'paragraph',
          text: '5.5. **Aportes colectivos.** Un mismo regalo puede recibir aportes de varios invitados. Su aporte se registra a favor del Organizador **con independencia de que el regalo alcance o no el 100% de su valor**. Si el regalo no se completa, su aporte no se reintegra por esa causa.',
        },
      ],
    },
    {
      heading: 'Sección 6 — Sus datos y su mensaje',
      blocks: [
        {
          type: 'paragraph',
          text: '6.1. **Datos que recolectamos.** Para procesar su regalo recolectamos su nombre, correo electrónico y los datos necesarios para el pago. El tratamiento se rige por nuestra Política de Privacidad, publicada en somoswedin.com y accesible desde el pie de página del sitio.',
        },
        {
          type: 'paragraph',
          text: '6.2. **Información visible para el Organizador.** El Organizador podrá visualizar, desde su panel privado, **su nombre, el regalo elegido, el monto aportado, la fecha y el mensaje** que usted deje. Esta información no se publica en la Lista. **wedin no ofrece la opción de regalo anónimo:** su nombre, tal como lo informe en el checkout, será visible para el Organizador.',
        },
        {
          type: 'paragraph',
          text: '6.3. **Su mensaje.** El mensaje que usted escriba será visible **únicamente para el Organizador, desde su panel privado**. No se publica en la Lista ni queda a la vista de otros invitados o visitantes. Aun así, no incluya en él datos sensibles, información confidencial ni contenido ofensivo, discriminatorio, difamatorio, obsceno o que infrinja derechos de terceros. wedin podrá moderar o eliminar mensajes que incumplan lo anterior.',
        },
        {
          type: 'paragraph',
          text: '6.4. **Comunicaciones.** wedin le enviará las comunicaciones necesarias para confirmar y gestionar su operación. Podrá recibir comunicaciones comerciales solo si presta su consentimiento, y podrá revocarlo en cualquier momento.',
        },
      ],
    },
    {
      heading: 'Sección 7 — Documentación fiscal',
      blocks: [
        {
          type: 'paragraph',
          text: '7.1. El monto correspondiente al regalo **no constituye una venta de bienes o servicios efectuada por wedin a su favor**, sino una liberalidad realizada por usted al Organizador. En consecuencia, wedin **no emite factura por el valor del regalo**.',
        },
        {
          type: 'paragraph',
          text: '7.2. wedin emitirá, cuando corresponda y a su solicitud, el comprobante legal por el **cargo por servicio del 3%**, que sí retribuye un servicio prestado por wedin a usted. Para solicitarlo, escriba a **admin@somoswedin.com** indicando sus datos de facturación y el número de operación.',
        },
        {
          type: 'paragraph',
          text: '7.3. La documentación fiscal se emite conforme a la naturaleza de cada operación y a la normativa tributaria paraguaya vigente.',
        },
      ],
    },
    {
      heading: 'Sección 8 — Conductas prohibidas',
      blocks: [
        {
          type: 'paragraph',
          text: 'Usted se obliga a no utilizar los Servicios para:',
        },
        {
          type: 'list',
          items: [
            'a. Realizar pagos con medios de pago robados, adulterados o cuyo uso no esté autorizado;',
            'b. Canalizar fondos de origen ilícito o utilizar la plataforma con fines de lavado de activos o financiamiento del terrorismo;',
            'c. Suplantar la identidad de terceros o proporcionar información falsa;',
            'd. Enviar mensajes ofensivos, acosadores, amenazantes, discriminatorios, difamatorios, obscenos o publicitarios no solicitados;',
            'e. Utilizar robots, scrapers, herramientas automatizadas o agentes de inteligencia artificial para acceder o interactuar con los Servicios sin identificarse como tales, o para eludir medidas de seguridad, CAPTCHA o límites de uso;',
            'f. Recolectar, extraer o hacer seguimiento de datos personales de Organizadores o de otros invitados;',
            'g. Introducir código malicioso, interferir con el funcionamiento de la plataforma o vulnerar sus medidas de seguridad;',
            'h. Reproducir, copiar, revender o explotar comercialmente cualquier parte de los Servicios.',
          ],
        },
        {
          type: 'paragraph',
          text: 'wedin podrá rechazar, anular o revertir operaciones, y bloquear el acceso, ante el incumplimiento de esta sección o ante indicios razonables de fraude, sin perjuicio de las acciones legales que correspondan.',
        },
      ],
    },
    {
      heading: 'Sección 9 — Propiedad intelectual',
      blocks: [
        {
          type: 'paragraph',
          text: 'La plataforma, su código, diseño, estructura, textos, gráficos, marcas y logotipos son de titularidad exclusiva de wedin o de sus licenciantes. Estos Términos le otorgan únicamente un derecho limitado, revocable y no exclusivo de uso de los Servicios para fines personales y no comerciales. No podrá reproducir, distribuir, modificar ni crear obras derivadas sin autorización previa y escrita de wedin.',
        },
      ],
    },
    {
      heading: 'Sección 10 — Disponibilidad y enlaces de terceros',
      blocks: [
        {
          type: 'paragraph',
          text: '10.1. Los Servicios se prestan “tal cual” y “según disponibilidad”. wedin no garantiza un funcionamiento ininterrumpido, oportuno o libre de errores, y no será responsable por interrupciones, demoras o rechazos imputables a la procesadora de pagos, a las entidades bancarias, a las redes de tarjetas o a los sistemas de telecomunicaciones.',
        },
        {
          type: 'paragraph',
          text: '10.2. La plataforma puede contener enlaces a sitios de terceros. wedin no controla ni examina su contenido y no será responsable por daños derivados de su acceso o utilización. Le recomendamos revisar sus políticas antes de interactuar con ellos.',
        },
      ],
    },
    {
      heading: 'Sección 11 — Limitación de responsabilidad',
      blocks: [
        {
          type: 'paragraph',
          text: '11.1. **De qué responde wedin.** wedin responde frente a usted por el correcto cumplimiento del servicio descrito en la cláusula 5.1. Si por una falla imputable a wedin su pago fue cobrado por un monto distinto al confirmado, cobrado por duplicado o no fue registrado a favor del Organizador, wedin le restituirá **la totalidad de lo que usted abonó**, incluido el cargo por servicio del 3%, conforme al procedimiento de la cláusula 4.2.',
        },
        {
          type: 'paragraph',
          text: '11.2. **De qué no responde wedin.** wedin no responde por el incumplimiento del Organizador frente a sus invitados, por la no realización, postergación o modificación del Evento, por el destino que el Organizador dé al dinero, ni por daños indirectos, incidentales o consecuentes derivados de esas circunstancias. Fuera de los supuestos de la cláusula 11.1, wedin no reembolsa el valor del regalo, que pertenece al Organizador.',
        },
        {
          type: 'paragraph',
          text: '11.3. Nada en esta sección limita la responsabilidad de wedin por dolo o culpa grave, ni los derechos que le asisten como consumidor conforme a la Ley N° 1334/98 de Defensa del Consumidor y del Usuario y demás normativa de orden público aplicable.',
        },
      ],
    },
    {
      heading: 'Sección 12 — Disposiciones generales',
      blocks: [
        {
          type: 'paragraph',
          text: '12.1. **Modificaciones.** wedin podrá modificar estos Términos publicando la versión actualizada en esta página. Los Términos aplicables a su operación son los vigentes al momento en que usted confirma el pago.',
        },
        {
          type: 'paragraph',
          text: '12.2. **Nulidad parcial.** La nulidad o inaplicabilidad de una cláusula no afectará la validez de las restantes.',
        },
        {
          type: 'paragraph',
          text: '12.3. **No renuncia.** La falta de ejercicio de un derecho por parte de wedin no implica renuncia al mismo.',
        },
        {
          type: 'paragraph',
          text: '12.4. **Acuerdo íntegro.** Estos Términos, junto con la Política de Privacidad, constituyen el acuerdo completo entre las partes respecto de su objeto.',
        },
        {
          type: 'paragraph',
          text: '12.5. **Ley aplicable y jurisdicción.** Estos Términos se rigen por las leyes de la República del Paraguay. Toda controversia se someterá a los tribunales ordinarios de la ciudad de Asunción, sin perjuicio del fuero que corresponda de manera imperativa en materia de defensa del consumidor.',
        },
      ],
    },
    {
      heading: 'Sección 13 — Contacto',
      blocks: [
        {
          type: 'paragraph',
          text: '**wedin — TEODORO E.A.S.** · RUC: 80175973-0 · Correo: **admin@somoswedin.com** · WhatsApp: **+595 994 871 212** · Domicilio: Teodoro S. Mongelós 3685, barrio Mburicaó, Asunción, Paraguay.',
        },
      ],
    },
  ],
}
