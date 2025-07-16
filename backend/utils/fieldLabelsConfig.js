// fieldsConfig.js
module.exports = {
    ca: {
        // QUALIFY FIELDS
        firstName: { label: 'First Name:', placeholder: 'First Name*', type: 'text' },
        lastName:  { label: 'Last Name:',  placeholder: 'Last Name*',  type: 'text' },
        email:     { label: 'Email:',      placeholder: 'Email*',      type: 'email' },
        phone:     { label: 'Phone:',      placeholder: 'Phone*',      type: 'tel' },

        // SHIPPING FIELDS
        address:   { label: 'Address:',    placeholder: 'Address*',    type: 'text' },
        zipCode:   { label: 'Postal Code:',placeholder: 'Postal Code*',type: 'text' },
        city:      { label: 'City:',       placeholder: 'City*',       type: 'text' },
        state:     { label: 'Province:',   placeholder: 'Select Province',            type: 'select' }, // select
        country:   { label: 'Country:',    placeholder: '',            type: 'select' }, // select
    },

    us: {
        firstName: { label: 'First Name:', placeholder: 'First Name*', type: 'text' },
        lastName:  { label: 'Last Name:',  placeholder: 'Last Name*',  type: 'text' },
        email:     { label: 'Email:',      placeholder: 'Email*',      type: 'email' },
        phone:     { label: 'Phone:',      placeholder: 'Phone*',      type: 'tel' },

        address:   { label: 'Address:',    placeholder: 'Address*',    type: 'text' },
        zipCode:   { label: 'Zip Code:',   placeholder: 'Zip Code*',   type: 'text' },
        city:      { label: 'City:',       placeholder: 'City*',       type: 'text' },
        state:     { label: 'State:',      placeholder: 'Select State',            type: 'select' }, // select
        country:   { label: 'Country:',    placeholder: '',            type: 'select' }, // select
    },

    au: {
        firstName: { label: 'First Name:', placeholder: 'First Name*', type: 'text' },
        lastName:  { label: 'Last Name:',  placeholder: 'Last Name*',  type: 'text' },
        email:     { label: 'Email:',      placeholder: 'Email*',      type: 'email' },
        phone:     { label: 'Phone:',      placeholder: 'Phone*',      type: 'tel' },

        address:   { label: 'Address:',    placeholder: 'Address*',    type: 'text' },
        zipCode:   { label: 'Zip/Postal Code:',   placeholder: 'Zip/Postal Code*',   type: 'text' },
        city:      { label: 'City:',       placeholder: 'City*',       type: 'text' },
        state:     { label: 'State/Territory:',      placeholder: 'Select State/Territory',            type: 'select' }, // select
        country:   { label: 'Country:',    placeholder: '',            type: 'select' }, // select
    },

    nz: {
        firstName: { label: 'First Name:', placeholder: 'First Name*', type: 'text' },
        lastName:  { label: 'Last Name:',  placeholder: 'Last Name*',  type: 'text' },
        email:     { label: 'Email:',      placeholder: 'Email*',      type: 'email' },
        phone:     { label: 'Phone:',      placeholder: 'Phone*',      type: 'tel' },

        address:   { label: 'Address:',    placeholder: 'Address*',    type: 'text' },
        zipCode:   { label: 'Zip/Postal Code:',   placeholder: 'Zip/Postal Code*',   type: 'text' },
        city:      { label: 'City:',       placeholder: 'City*',       type: 'text' },
        state:     { label: 'Region:',      placeholder: 'Select Region',            type: 'select' }, // select
        country:   { label: 'Country:',    placeholder: '',            type: 'select' }, // select
    },

    il: {
        firstName: { label: 'First Name:', placeholder: 'First Name*', type: 'text' },
        lastName:  { label: 'Last Name:',  placeholder: 'Last Name*',  type: 'text' },
        email:     { label: 'Email:',      placeholder: 'Email*',      type: 'email' },
        phone:     { label: 'Phone:',      placeholder: 'Phone*',      type: 'tel' },

        address:   { label: 'Address:',    placeholder: 'Address*',    type: 'text' },
        zipCode:   { label: 'Postal Code:',   placeholder: 'Postal Code*',   type: 'text' },
        city:      { label: 'City:',       placeholder: 'City*',       type: 'text' },
        state:     { label: 'State/Province:',      placeholder: 'Select State or Province',            type: 'select' }, // select
        country:   { label: 'Country:',    placeholder: '',            type: 'select' }, // select
    },

    za: {
        firstName: { label: 'First Name:', placeholder: 'First Name*', type: 'text' },
        lastName:  { label: 'Last Name:',  placeholder: 'Last Name*',  type: 'text' },
        email:     { label: 'Email:',      placeholder: 'Email*',      type: 'email' },
        phone:     { label: 'Phone:',      placeholder: 'Phone*',      type: 'tel' },

        address:   { label: 'Address:',    placeholder: 'Address*',    type: 'text' },
        zipCode:   { label: 'Postal Code:',   placeholder: 'Postal Code*',   type: 'text' },
        city:      { label: 'City:',       placeholder: 'City*',       type: 'text' },
        state:     { label: 'Province:',      placeholder: 'Select Province',            type: 'select' }, // select
        country:   { label: 'Country:',    placeholder: '',            type: 'select' }, // select
    },

    sg: {
        firstName: { label: 'First Name:', placeholder: 'First Name*', type: 'text' },
        lastName:  { label: 'Last Name:',  placeholder: 'Last Name*',  type: 'text' },
        email:     { label: 'Email:',      placeholder: 'Email*',      type: 'email' },
        phone:     { label: 'Phone:',      placeholder: 'Phone*',      type: 'tel' },

        address:   { label: 'Address:',    placeholder: 'Address*',    type: 'text' },
        zipCode:   { label: 'Postal Code:',   placeholder: 'Postal Code*',   type: 'text' },
        city:      { label: 'City:',       placeholder: 'City*',       type: 'text' },
        state:     { label: 'Region:',      placeholder: 'Select Region',            type: 'select' }, // select
        country:   { label: 'Country:',    placeholder: '',            type: 'select' }, // select
    },

    uk: {
        firstName: { label: 'Name:', placeholder: 'Name*', type: 'text' },
        lastName:  { label: 'Surname:',  placeholder: 'Surname*',  type: 'text' },
        email:     { label: 'Email:',      placeholder: 'Email*',      type: 'email' },
        phone:     { label: 'Phone:',      placeholder: 'Phone*',      type: 'tel' },

        address:   { label: 'Address:',    placeholder: 'Address*',    type: 'text' },
        zipCode:   { label: 'Postal Code:',   placeholder: 'Postal Code*',   type: 'text' },
        city:      { label: 'Town:',       placeholder: 'Town*',       type: 'text' },
        state:     { label: 'County:',      placeholder: 'Select County',            type: 'select' }, // select
        country:   { label: 'Country:',    placeholder: '',            type: 'select' }, // select
    },

    ie: {
        firstName: {label: 'Name:', placeholder: 'Name*', type: 'text'},
        lastName: {label: 'Surname:', placeholder: 'Surname*', type: 'text'},
        email: {label: 'Email:', placeholder: 'Email*', type: 'email'},
        phone: {label: 'Phone:', placeholder: 'Phone*', type: 'tel'},

        address: {label: 'Address:', placeholder: 'Address*', type: 'text'},
        zipCode: {label: 'Postal Code:', placeholder: 'Postal Code*', type: 'text'},
        city: {label: 'Town:', placeholder: 'Town*', type: 'text'},
        state: {label: 'County:', placeholder: 'Select County', type: 'select'}, // select
        country: {label: 'Country:', placeholder: '', type: 'select'}, // select
    },

    fr: {
        firstName: {label: 'Prénom :', placeholder: 'Prénom*', type: 'text'},
        lastName: {label: 'Nom de famille :', placeholder: 'Nom de famille*', type: 'text'},
        email: {label: 'Email :', placeholder: 'Email*', type: 'email'},
        phone: {label: 'Téléphone :', placeholder: 'Téléphone*', type: 'tel'},

        address: {label: 'Adresse :', placeholder: 'Adresse*', type: 'text'},
        zipCode: {label: 'Code postal :', placeholder: 'Code postal*', type: 'text'},
        city: {label: 'Ville :', placeholder: 'Ville*', type: 'text'},
        state: {label: 'Région :', placeholder: 'Sélectionnez la région', type: 'select'}, // select
        country: {label: 'Pays :', placeholder: '', type: 'select'}, // select
    },

    ca_fr: {
        firstName: {label: 'Prénom:', placeholder: 'Prénom*', type: 'text'},
        lastName: {label: 'Nom de famille:', placeholder: 'Nom de famille*', type: 'text'},
        email: {label: 'Email:', placeholder: 'Email*', type: 'email'},
        phone: {label: 'Téléphone:', placeholder: 'Téléphone*', type: 'tel'},

        address: {label: 'Adresse:', placeholder: 'Adresse*', type: 'text'},
        zipCode: {label: 'Code postal:', placeholder: 'Code postal*', type: 'text'},
        city: {label: 'Ville:', placeholder: 'Ville*', type: 'text'},
        state: {label: 'Province:', placeholder: 'Sélectionnez la province', type: 'select'}, // select
        country: {label: 'Pays:', placeholder: '', type: 'select'}, // select
    },

    ch_fr: {
        firstName: {label: 'Prénom :', placeholder: 'Prénom*', type: 'text'},
        lastName: {label: 'Nom de famille :', placeholder: 'Nom de famille*', type: 'text'},
        email: {label: 'Email :', placeholder: 'Email*', type: 'email'},
        phone: {label: 'Téléphone :', placeholder: 'Téléphone*', type: 'tel'},

        address: {label: 'Adresse :', placeholder: 'Adresse*', type: 'text'},
        zipCode: {label: 'Code postal :', placeholder: 'Code postal*', type: 'text'},
        city: {label: 'Ville :', placeholder: 'Ville*', type: 'text'},
        state: {label: 'Canton :', placeholder: 'Sélectionnez un canton', type: 'select'}, // select
        country: {label: 'Pays :', placeholder: '', type: 'select'}, // select
    },

    de: {
        firstName: {label: 'Vorname:', placeholder: 'Vorname*', type: 'text'},
        lastName: {label: 'Nachname:', placeholder: 'Nachname*', type: 'text'},
        email: {label: 'E-Mail:', placeholder: 'E-Mail*', type: 'email'},
        phone: {label: 'Telefon:', placeholder: 'Telefon*', type: 'tel'},

        address: {label: 'Adresse:', placeholder: 'Adresse*', type: 'text'},
        zipCode: {label: 'PLZ:', placeholder: 'PLZ*', type: 'text'},
        city: {label: 'Stadt:', placeholder: 'Stadt*', type: 'text'},
        state: {label: 'Bundesland:', placeholder: 'Bundesland auswählen', type: 'select'}, // select
        country: {label: 'Land:', placeholder: '', type: 'select'}, // select
    },

    ch_de: {
        firstName: {label: 'Vorname:', placeholder: 'Vorname*', type: 'text'},
        lastName: {label: 'Nachname:', placeholder: 'Nachname*', type: 'text'},
        email: {label: 'E-Mail:', placeholder: 'E-Mail*', type: 'email'},
        phone: {label: 'Telefon:', placeholder: 'Telefon*', type: 'tel'},

        address: {label: 'Adresse:', placeholder: 'Adresse*', type: 'text'},
        zipCode: {label: 'PLZ:', placeholder: 'PLZ*', type: 'text'},
        city: {label: 'Stadt:', placeholder: 'Stadt*', type: 'text'},
        state: {label: 'Kanton:', placeholder: 'Kanton auswählen', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    es: {
        firstName: {label: 'Nombre:', placeholder: 'Nombre*', type: 'text'},
        lastName: {label: 'Apellido:', placeholder: 'Apellido*', type: 'text'},
        email: {label: 'Correo electrónico:', placeholder: 'Correo electrónico*', type: 'email'},
        phone: {label: 'Teléfono:', placeholder: 'Teléfono*', type: 'tel'},

        address: {label: 'Dirección:', placeholder: 'Dirección*', type: 'text'},
        zipCode: {label: 'Código postal:', placeholder: 'Código postal*', type: 'text'},
        city: {label: 'Ciudad:', placeholder: 'Ciudad*', type: 'text'},
        state: {label: 'Provincia:', placeholder: 'Seleccione provincia', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    us_es: {
        firstName: {label: 'Nombre:', placeholder: 'Nombre*', type: 'text'},
        lastName: {label: 'Apellido:', placeholder: 'Apellido*', type: 'text'},
        email: {label: 'Correo electrónico:', placeholder: 'Correo electrónico*', type: 'email'},
        phone: {label: 'Teléfono:', placeholder: 'Teléfono*', type: 'tel'},

        address: {label: 'Dirección:', placeholder: 'Dirección*', type: 'text'},
        zipCode: {label: 'Código postal:', placeholder: 'Código postal*', type: 'text'},
        city: {label: 'Ciudad:', placeholder: 'Ciudad*', type: 'text'},
        state: {label: 'Estado:', placeholder: 'Seleccionar estado', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    pr: {
        firstName: {label: 'Nombre:', placeholder: 'Nombre*', type: 'text'},
        lastName: {label: 'Apellido:', placeholder: 'Apellido*', type: 'text'},
        email: {label: 'Correo electrónico:', placeholder: 'Correo electrónico*', type: 'email'},
        phone: {label: 'Teléfono:', placeholder: 'Teléfono*', type: 'tel'},

        address: {label: 'Dirección:', placeholder: 'Dirección*', type: 'text'},
        zipCode: {label: 'Código postal:', placeholder: 'Código postal*', type: 'text'},
        city: {label: 'Ciudad:', placeholder: 'Ciudad*', type: 'text'},
        state: {label: 'Municipio:', placeholder: 'Seleccione municipio', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    cl: {
        firstName: {label: 'Nombre:', placeholder: 'Nombre*', type: 'text'},
        lastName: {label: 'Apellido:', placeholder: 'Apellido*', type: 'text'},
        email: {label: 'Correo electrónico:', placeholder: 'Correo electrónico*', type: 'email'},
        phone: {label: 'Teléfono:', placeholder: 'Teléfono*', type: 'tel'},

        address: {label: 'Dirección:', placeholder: 'Dirección*', type: 'text'},
        zipCode: {label: 'Código postal:', placeholder: 'Código postal*', type: 'text'},
        city: {label: 'Ciudad:', placeholder: 'Ciudad*', type: 'text'},
        state: {label: 'Región:', placeholder: 'Seleccione región', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    ar: {
        firstName: {label: 'Nombre:', placeholder: 'Nombre*', type: 'text'},
        lastName: {label: 'Apellido:', placeholder: 'Apellido*', type: 'text'},
        email: {label: 'Correo electrónico:', placeholder: 'Correo electrónico*', type: 'email'},
        phone: {label: 'Teléfono:', placeholder: 'Teléfono*', type: 'tel'},

        address: {label: 'Dirección:', placeholder: 'Dirección*', type: 'text'},
        zipCode: {label: 'Código postal:', placeholder: 'Código postal*', type: 'text'},
        city: {label: 'Ciudad:', placeholder: 'Ciudad*', type: 'text'},
        state: {label: 'Provincia:', placeholder: 'Seleccione provincia', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    mx: {
        firstName: {label: 'Nombre:', placeholder: 'Nombre*', type: 'text'},
        lastName: {label: 'Apellido:', placeholder: 'Apellido*', type: 'text'},
        email: {label: 'Correo electrónico:', placeholder: 'Correo electrónico*', type: 'email'},
        phone: {label: 'Teléfono:', placeholder: 'Teléfono*', type: 'tel'},

        address: {label: 'Dirección:', placeholder: 'Dirección*', type: 'text'},
        zipCode: {label: 'Código postal:', placeholder: 'Código postal*', type: 'text'},
        city: {label: 'Ciudad:', placeholder: 'Ciudad*', type: 'text'},
        state: {label: 'Estado:', placeholder: 'Seleccione estado', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    co: {
        firstName: {label: 'Nombre:', placeholder: 'Nombre*', type: 'text'},
        lastName: {label: 'Apellido:', placeholder: 'Apellido*', type: 'text'},
        email: {label: 'Correo electrónico:', placeholder: 'Correo electrónico*', type: 'email'},
        phone: {label: 'Teléfono:', placeholder: 'Teléfono*', type: 'tel'},

        address: {label: 'Dirección:', placeholder: 'Dirección*', type: 'text'},
        zipCode: {label: 'Código postal:', placeholder: 'Código postal*', type: 'text'},
        city: {label: 'Ciudad:', placeholder: 'Ciudad*', type: 'text'},
        state: {label: 'Departamento:', placeholder: 'Seleccionar departamento', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    pe: {
        firstName: {label: 'Nombre:', placeholder: 'Nombre*', type: 'text'},
        lastName: {label: 'Apellido:', placeholder: 'Apellido*', type: 'text'},
        email: {label: 'Correo electrónico:', placeholder: 'Correo electrónico*', type: 'email'},
        phone: {label: 'Teléfono:', placeholder: 'Teléfono*', type: 'tel'},

        address: {label: 'Dirección:', placeholder: 'Dirección*', type: 'text'},
        zipCode: {label: 'Código postal:', placeholder: 'Código postal*', type: 'text'},
        city: {label: 'Ciudad:', placeholder: 'Ciudad*', type: 'text'},
        state: {label: 'Región:', placeholder: 'Seleccionar región', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    pt: {
        firstName: {label: 'Nome:', placeholder: 'Nome*', type: 'text'},
        lastName: {label: 'Sobrenome:', placeholder: 'Sobrenome*', type: 'text'},
        email: {label: 'E-mail:', placeholder: 'E-mail*', type: 'email'},
        phone: {label: 'Telefone:', placeholder: 'Telefone*', type: 'tel'},

        address: {label: 'Endereço:', placeholder: 'Endereço*', type: 'text'},
        zipCode: {label: 'CEP:', placeholder: 'CEP*', type: 'text'},
        city: {label: 'Cidade:', placeholder: 'Cidade*', type: 'text'},
        state: {label: 'Distrito:', placeholder: 'Selecionar distrito', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    br_pt: {
        firstName: {label: 'Nome:', placeholder: 'Nome*', type: 'text'},
        lastName: {label: 'Sobrenome:', placeholder: 'Sobrenome*', type: 'text'},
        email: {label: 'E-mail:', placeholder: 'E-mail*', type: 'email'},
        phone: {label: 'Telefone:', placeholder: 'Telefone*', type: 'tel'},

        address: {label: 'Endereço:', placeholder: 'Endereço*', type: 'text'},
        zipCode: {label: 'CEP:', placeholder: 'CEP*', type: 'text'},
        city: {label: 'Cidade:', placeholder: 'Cidade*', type: 'text'},
        state: {label: 'Estado:', placeholder: 'Selecionar estado', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    se: {
        firstName: {label: 'Förnamn:', placeholder: 'Förnamn*', type: 'text'},
        lastName: {label: 'Efternamn:', placeholder: 'Efternamn*', type: 'text'},
        email: {label: 'E-post:', placeholder: 'E-post*', type: 'email'},
        phone: {label: 'Telefonnummer:', placeholder: 'Telefonnummer*', type: 'tel'},

        address: {label: 'Adress:', placeholder: 'Adress*', type: 'text'},
        zipCode: {label: 'Postnummer:', placeholder: 'Postnummer*', type: 'text'},
        city: {label: 'Stad:', placeholder: 'Stad*', type: 'text'},
        state: {label: 'Län:', placeholder: 'Välj län', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    dk: {
        firstName: {label: 'Fornavn:', placeholder: 'Fornavn*', type: 'text'},
        lastName: {label: 'Efternavn:', placeholder: 'Efternavn*', type: 'text'},
        email: {label: 'E-mail:', placeholder: 'E-mail*', type: 'email'},
        phone: {label: 'Telefonnummer:', placeholder: 'Telefonnummer*', type: 'tel'},

        address: {label: 'Adresse:', placeholder: 'Adresse*', type: 'text'},
        zipCode: {label: 'Postnummer:', placeholder: 'Postnummer*', type: 'text'},
        city: {label: 'By:', placeholder: 'By*', type: 'text'},
        state: {label: 'Region:', placeholder: 'Vælg region', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    it: {
        firstName: {label: 'Nome:', placeholder: 'Nome*', type: 'text'},
        lastName: {label: 'Cognome:', placeholder: 'Cognome*', type: 'text'},
        email: {label: 'E-mail:', placeholder: 'E-mail*', type: 'email'},
        phone: {label: 'Numero di telefono:', placeholder: 'Numero di telefono*', type: 'tel'},

        address: {label: 'Indirizzo:', placeholder: 'Indirizzo*', type: 'text'},
        zipCode: {label: 'Codice postale:', placeholder: 'Codice postale*', type: 'text'},
        city: {label: 'Città:', placeholder: 'Città*', type: 'text'},
        state: {label: 'Regione:', placeholder: 'Seleziona la regione', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    no: {
        firstName: {label: 'Navn:', placeholder: 'Navn*', type: 'text'},
        lastName: {label: 'Etternavn:', placeholder: 'Etternavn*', type: 'text'},
        email: {label: 'E-post:', placeholder: 'E-post*', type: 'email'},
        phone: {label: 'Telefon:', placeholder: 'Telefon*', type: 'tel'},

        address: {label: 'Adresse:', placeholder: 'Adresse*', type: 'text'},
        zipCode: {label: 'Postnummer:', placeholder: 'Postnummer*', type: 'text'},
        city: {label: 'By:', placeholder: 'By*', type: 'text'},
        state: {label: 'Fylke:', placeholder: 'Velg fylke', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    fi: {
        firstName: {label: 'Etunimi:', placeholder: 'Etunimi*', type: 'text'},
        lastName: {label: 'Sukunimi:', placeholder: 'Sukunimi*', type: 'text'},
        email: {label: 'Sähköposti:', placeholder: 'Sähköposti*', type: 'email'},
        phone: {label: 'Puhelin:', placeholder: 'Puhelin*', type: 'tel'},

        address: {label: 'Osoite:', placeholder: 'Osoite*', type: 'text'},
        zipCode: {label: 'Postinumero:', placeholder: 'Postinumero*', type: 'text'},
        city: {label: 'Postitoimipaikka:', placeholder: 'Postitoimipaikka*', type: 'text'},
        state: {label: 'Maakunta:', placeholder: 'Valitse maakunta', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    is: {
        firstName: {label: 'Nafn:', placeholder: 'Nafn*', type: 'text'},
        lastName: {label: 'Eftirnafn:', placeholder: 'Eftirnafn*', type: 'text'},
        email: {label: 'Netfang:', placeholder: 'Netfang*', type: 'email'},
        phone: {label: 'Sími:', placeholder: 'Sími*', type: 'tel'},

        address: {label: 'Heimilisfang:', placeholder: 'Heimilisfang*', type: 'text'},
        zipCode: {label: 'Póstnúmer:', placeholder: 'Póstnúmer*', type: 'text'},
        city: {label: 'Bær:', placeholder: 'Bær*', type: 'text'},
        state: {label: 'Svæði:', placeholder: 'Veldu svæði', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    nl: {
        firstName: {label: 'Naam:', placeholder: 'Naam*', type: 'text'},
        lastName: {label: 'Achternaam:', placeholder: 'Achternaam*', type: 'text'},
        email: {label: 'E-mail:', placeholder: 'E-mail*', type: 'email'},
        phone: {label: 'Telefoon:', placeholder: 'Telefoon*', type: 'tel'},

        address: {label: 'Adres:', placeholder: 'Adres*', type: 'text'},
        zipCode: {label: 'Postcode:', placeholder: 'Postcode*', type: 'text'},
        city: {label: 'Stad:', placeholder: 'Stad*', type: 'text'},
        state: {label: 'Provincie:', placeholder: 'Kies provincie', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    },

    jp: {
        firstName: {label: '名:', placeholder: '名*', type: 'text'},
        lastName: {label: '姓:', placeholder: '姓*', type: 'text'},
        email: {label: 'メールアドレス:', placeholder: 'メールアドレス*', type: 'email'},
        phone: {label: '電話番号:', placeholder: '電話番号*', type: 'tel'},

        address: {label: '住所:', placeholder: '住所*', type: 'text'},
        zipCode: {label: '郵便番号:', placeholder: '郵便番号*', type: 'text'},
        city: {label: '市区町村:', placeholder: '市区町村*', type: 'text'},
        state: {label: '都道府県:', placeholder: '都道府県を選択', type: 'select'}, // select
        country: {label: '', placeholder: '', type: 'select'}, // select
    }
};
