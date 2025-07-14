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
        state:     { label: 'State:',      placeholder: 'Select State', type: 'select' }, // select
        country:   { label: 'Country:',    placeholder: '',            type: 'select' }, // select
    },

};
