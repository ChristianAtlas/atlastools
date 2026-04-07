import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Phone, Mail, MapPin, Building2 } from 'lucide-react';

interface AgencyInfo {
  state: string;
  name: string;
  agency: string;
  division?: string;
  address: string;
  phones: string[];
  fax?: string;
  email?: string;
  website: string;
}

const AGENCIES: AgencyInfo[] = [
  { state: 'AL', name: 'Alabama', agency: 'Department of Revenue', division: 'Individual and Corporate Tax Division — Withholding Tax Section', address: 'P.O. Box 327480, Montgomery, AL 36132-7480', phones: ['334-242-1300', '334-242-1170'], fax: '334-242-0112', email: 'taxpolicy@revenue.alabama.gov', website: 'https://www.revenue.alabama.gov/individual-corporate/withholding-tax-2/' },
  { state: 'AZ', name: 'Arizona', agency: 'Department of Revenue', division: 'Income Tax Withholding Division', address: 'P.O. Box 29009, Phoenix, AZ 85038-9009', phones: ['602-255-2060', '800-843-7196'], fax: '602-542-2072', email: 'taxpayerassistance@azdor.gov', website: 'https://azdor.gov/business/withholding-tax' },
  { state: 'AR', name: 'Arkansas', agency: 'Department of Finance and Administration', division: 'Office of Income Tax Administration — Withholding Tax Branch', address: 'P.O. Box 8055, Little Rock, AR 72203-8055', phones: ['501-682-7290'], fax: '501-683-1036', email: 'withholding@dfa.arkansas.gov', website: 'https://www.dfa.arkansas.gov/office/taxes/income-tax-administration/withholding-tax-branch/' },
  { state: 'CA', name: 'California', agency: 'Employment Development Department', division: 'Taxpayer Assistance Center', address: 'P.O. Box 2068, Rancho Cordova, CA 95741-2068', phones: ['888-745-3886'], fax: '916-464-3504', website: 'https://edd.ca.gov/payroll_taxes' },
  { state: 'CO', name: 'Colorado', agency: 'Department of Revenue', division: 'Taxation Division', address: '1375 Sherman St., Denver, CO 80261-0009', phones: ['303-238-7378'], fax: '303-866-3211', email: 'DOR_TaxpayerService@state.co.us', website: 'https://tax.colorado.gov/withholding-tax' },
  { state: 'CT', name: 'Connecticut', agency: 'Department of Revenue Services', division: 'Taxpayer Services Division', address: '450 Columbus Blvd., Ste. 1, Hartford, CT 06103', phones: ['860-297-5962'], fax: '800-382-9463', email: 'DRS@ct.gov', website: 'https://portal.ct.gov/DRS/Withholding-Taxes/Tax-Information' },
  { state: 'DE', name: 'Delaware', agency: 'Department of Finance', division: 'Division of Revenue — Office of Business Taxes', address: '820 North French St., Wilmington, DE 19801', phones: ['302-577-8779', '302-577-8230', '800-292-7826'], fax: '302-577-8202', email: 'DOR_BusinessTax@delaware.gov', website: 'https://revenue.delaware.gov' },
  { state: 'DC', name: 'District of Columbia', agency: 'Office of Tax and Revenue', division: 'Office of the Chief Financial Officer', address: '1101 4th St., SW, Washington, DC 20024', phones: ['202-727-4829'], fax: '202-442-6890', email: 'taxhelp@dc.gov', website: 'https://otr.cfo.dc.gov' },
  { state: 'GA', name: 'Georgia', agency: 'Department of Revenue', division: 'Withholding Tax Unit', address: '1800 Century Blvd., Room 7100, Atlanta, GA 30345', phones: ['404-417-2400', '877-423-6711'], fax: '404-417-2439', email: 'taxpayer.services@dor.ga.gov', website: 'https://dor.georgia.gov/taxes/withholding-tax-employers' },
  { state: 'HI', name: 'Hawaii', agency: 'Department of Taxation', division: 'Taxpayer Services', address: 'P.O. Box 259, Honolulu, HI 96809-0259', phones: ['808-587-4242', '800-222-3229'], fax: '808-587-1488', email: 'Taxpayer.Services@hawaii.gov', website: 'http://tax.hawaii.gov' },
  { state: 'ID', name: 'Idaho', agency: 'State Tax Commission', address: 'P.O. Box 36, Boise, ID 83722-0410', phones: ['208-334-7660', '800-972-7660'], fax: '208-334-5378', email: 'taxrep@tax.idaho.gov', website: 'https://tax.idaho.gov/taxes/income-tax/withholding/' },
  { state: 'IL', name: 'Illinois', agency: 'Department of Revenue', address: 'Willard Ice Bldg., 101 West Jefferson St., Springfield, IL 62702', phones: ['217-782-3336', '800-732-8866'], email: 'REV.TA-BIT-WIT@illinois.gov', website: 'https://tax.illinois.gov/' },
  { state: 'IN', name: 'Indiana', agency: 'Department of Revenue', division: 'Taxpayer Services Division', address: 'P.O. Box 7222, Indianapolis, IN 46207-7222', phones: ['317-232-2240'], fax: '317-233-2329', website: 'https://www.in.gov/dor' },
  { state: 'IA', name: 'Iowa', agency: 'Department of Revenue', division: 'Withholding Correspondence', address: 'P.O. Box 10465, Des Moines, IA 50306-0465', phones: ['515-281-3114', '800-367-3388'], fax: '515-242-6487', email: 'idr@iowa.gov', website: 'https://revenue.iowa.gov/' },
  { state: 'KS', name: 'Kansas', agency: 'Department of Revenue', division: 'Withholding Tax', address: 'P.O. Box 758572, Topeka, KS 66675-8572', phones: ['785-368-8222'], fax: '785-291-3614', email: 'kdor_tac@ks.gov', website: 'https://www.ksrevenue.gov/forms-btwh.html' },
  { state: 'KY', name: 'Kentucky', agency: 'Department of Revenue', division: 'Employer Payroll Withholding', address: 'P.O. Box 181, Station 57, Frankfort, KY 40602-0181', phones: ['502-564-7287', '502-564-3658'], fax: '502-564-3685', website: 'https://revenue.ky.gov' },
  { state: 'LA', name: 'Louisiana', agency: 'Department of Revenue', address: 'P.O. Box 201, Baton Rouge, LA 70821-0201', phones: ['225-219-7462', '225-219-2200'], fax: '225-219-2447', website: 'https://revenue.louisiana.gov' },
  { state: 'ME', name: 'Maine', agency: 'Department of Administrative and Financial Services', division: 'Maine Revenue Services — Withholding Tax Division', address: 'P.O. Box 1060, Augusta, ME 04332-1060', phones: ['207-624-7661'], fax: '207-624-9694', email: 'withholding.tax@maine.gov', website: 'https://www.maine.gov/revenue' },
  { state: 'MD', name: 'Maryland', agency: 'Comptroller of Maryland', division: 'Revenue Administration Division — Taxpayer Service Section', address: '110 Carroll St., Annapolis, MD 21411-0001', phones: ['410-260-7980', '800-638-2937'], fax: '410-974-2967', email: 'taxhelp@marylandtaxes.gov', website: 'https://www.marylandtaxes.gov' },
  { state: 'MA', name: 'Massachusetts', agency: 'Department of Revenue', division: 'Taxpayer Services Division — Customer Service Bureau', address: 'P.O. Box 7010, Boston, MA 02204', phones: ['617-887-6367'], fax: '800-392-6089', website: 'https://www.mass.gov' },
  { state: 'MI', name: 'Michigan', agency: 'Department of the Treasury', division: 'Sales, Use, and Withholding Taxes Division', address: 'P.O. Box 30427, Lansing, MI 48922', phones: ['517-636-6925'], fax: '517-636-4491', email: 'treasSWU@michigan.gov', website: 'https://www.michigan.gov/treasury' },
  { state: 'MN', name: 'Minnesota', agency: 'Department of Revenue', address: 'Mail Station 6501, St. Paul, MN 55146-6501', phones: ['651-282-9999', '800-657-3594'], fax: '651-556-5152', email: 'withholding.tax@state.mn.us', website: 'https://revenue.state.mn.us' },
  { state: 'MS', name: 'Mississippi', agency: 'Department of Revenue', division: 'Withholding Tax Division', address: 'P.O. Box 1033, Jackson, MS 39215-1033', phones: ['601-923-7088'], fax: '601-923-7188', website: 'https://dor.ms.gov' },
  { state: 'MO', name: 'Missouri', agency: 'Department of Revenue', division: 'Employer Withholding Tax', address: 'P.O. Box 3375, Jefferson City, MO 65105-3375', phones: ['573-751-3505'], fax: '573-522-6816', email: 'withholding@dor.mo.gov', website: 'https://dor.mo.gov/taxation/business/tax-types/withholding/' },
  { state: 'MT', name: 'Montana', agency: 'Department of Revenue', division: 'Wage Withholding Taxes', address: 'P.O. Box 5835, Helena, MT 59604-5835', phones: ['406-444-6900', '866-859-2254'], fax: '406-444-0750', email: 'DORCustomerAssistance@mt.gov', website: 'https://revenue.mt.gov/taxes/#WageWithholdingTax' },
  { state: 'NE', name: 'Nebraska', agency: 'Department of Revenue', address: 'P.O. Box 94818, Lincoln, NE 68509-4818', phones: ['402-471-5729', '800-742-7474'], fax: '402-471-5608', website: 'https://revenue.nebraska.gov/' },
  { state: 'NJ', name: 'New Jersey', agency: 'Department of the Treasury', division: 'Division of Taxation', address: 'P.O. Box 281, Trenton, NJ 08695-0281', phones: ['609-292-6400'], website: 'https://www.nj.gov/treasury/taxation/' },
  { state: 'NM', name: 'New Mexico', agency: 'Taxation and Revenue Department', division: 'Tax Information / Policy Office', address: 'P.O. Box 630, Santa Fe, NM 87504-0630', phones: ['505-827-0700'], fax: '505-827-0331', website: 'https://www.tax.newmexico.gov' },
  { state: 'NY', name: 'New York', agency: 'Department of Taxation and Finance', address: 'W. A. Harriman Campus, Albany, NY 12227', phones: ['518-485-6654'], fax: '877-698-2910', website: 'https://www.tax.ny.gov/bus/wt/wtidx.htm' },
  { state: 'NC', name: 'North Carolina', agency: 'Department of Revenue', division: 'Taxpayer Assistance — Withholding Tax', address: 'P.O. Box 25000, Raleigh, NC 27640-0640', phones: ['877-252-3052'], email: 'eNC3@ncdor.gov', website: 'https://www.ncdor.gov/taxes-forms/withholding-tax' },
  { state: 'ND', name: 'North Dakota', agency: 'Office of State Tax Commissioner', address: '600 East Boulevard Ave., Dept. 127, Bismarck, ND 58505-0599', phones: ['701-328-2770', '701-328-1248'], fax: '701-328-3700', email: 'withhold@nd.gov', website: 'https://www.tax.nd.gov/' },
  { state: 'OH', name: 'Ohio', agency: 'Department of Taxation', division: 'Business Tax Division', address: 'P.O. Box 530, Columbus, OH 43216-0530', phones: ['888-405-4039', '614-387-0232'], fax: '614-387-1849', website: 'https://tax.ohio.gov/business/employer-withholding' },
  { state: 'OK', name: 'Oklahoma', agency: 'Oklahoma Tax Commission', address: '2501 North Lincoln Blvd., Oklahoma City, OK 73194', phones: ['405-521-3125', '800-522-8165'], fax: '405-522-0576', website: 'https://oklahoma.gov/tax/businesses/withholding.html' },
  { state: 'OR', name: 'Oregon', agency: 'Department of Revenue', division: 'Business Taxes Division', address: '955 Center St. NE, Salem, OR 97301-2555', phones: ['503-945-8091', '800-356-4222'], fax: '503-945-8738', email: 'payroll.help.dor@oregon.gov', website: 'https://www.oregon.gov/dor/programs/businesses/Pages/Withholding-and-Payroll-tax.aspx' },
  { state: 'PA', name: 'Pennsylvania', agency: 'Department of Revenue', division: 'Bureau of Business Trust Fund Taxes', address: 'P.O. Box 280904, Harrisburg, PA 17128-0904', phones: ['717-787-1064'], website: 'https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/employer-withholding' },
  { state: 'PR', name: 'Puerto Rico', agency: 'Department of the Treasury', address: 'P.O. Box 9024140, San Juan, PR 00902-4140', phones: ['787-721-2020'], fax: '787-723-7085', email: 'info@hacienda.pr.gov', website: 'https://hacienda.pr.gov/' },
  { state: 'RI', name: 'Rhode Island', agency: 'Division of Taxation', division: 'Employer Tax Section', address: 'One Capitol Hill, Providence, RI 02908', phones: ['401-574-8941'], fax: '401-574-8915', email: 'Tax.Collections@tax.ri.gov', website: 'https://tax.ri.gov/tax-sections/withholding-tax' },
  { state: 'SC', name: 'South Carolina', agency: 'Department of Revenue', address: 'P.O. Box 125, Columbia, SC 29214', phones: ['844-898-8542'], fax: '803-898-5822', email: 'WithholdingTax@dor.sc.gov', website: 'https://dor.sc.gov/withholding' },
  { state: 'UT', name: 'Utah', agency: 'State Tax Commission', address: '210 North 1950 West, Salt Lake City, UT 84134', phones: ['801-297-2200', '800-662-4335'], fax: '801-297-7699', email: 'taxmaster@utah.gov', website: 'http://tax.utah.gov' },
  { state: 'VT', name: 'Vermont', agency: 'Department of Taxes', division: 'Withholding Tax', address: 'P.O. Box 547, Montpelier, VT 05601-0547', phones: ['802-828-2551'], fax: '802-828-5787', email: 'tax.business@vermont.gov', website: 'https://tax.vermont.gov/business/withholding' },
  { state: 'VA', name: 'Virginia', agency: 'Department of Taxation', division: 'Office of Customer Services', address: 'P.O. Box 1115, Richmond, VA 23218-1115', phones: ['804-367-8037'], fax: '804-254-6111', email: 'TaxBusQuestions@tax.virginia.gov', website: 'https://www.tax.virginia.gov' },
  { state: 'WV', name: 'West Virginia', agency: 'State Tax Department', division: 'Withholding Tax Unit', address: 'P.O. Box 3784, Charleston, WV 25337-3784', phones: ['304-558-8644', '800-982-8297'], fax: '304-558-3269', email: 'TaxHelp@WV.Gov', website: 'https://tax.wv.gov/Pages/default.aspx' },
  { state: 'WI', name: 'Wisconsin', agency: 'Department of Revenue', address: 'P.O. Box 8949, Madison, WI 53708', phones: ['608-266-2776'], fax: '608-267-0834', email: 'DORSalesandUse@wisconsin.gov', website: 'https://www.revenue.wi.gov/Pages/Withholding/home.aspx' },
];

export function StateIncomeTaxDirectory() {
  const [selectedState, setSelectedState] = useState<string>('');
  const selected = AGENCIES.find(a => a.state === selectedState);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            State Income Tax Withholding Agency Directory
          </CardTitle>
          <CardDescription>
            Select a state to view the withholding tax agency contact information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select a state..." />
            </SelectTrigger>
            <SelectContent>
              {AGENCIES.map(a => (
                <SelectItem key={a.state} value={a.state}>{a.state} — {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  <Badge variant="outline" className="mr-2 text-base">{selected.state}</Badge>
                  {selected.name}
                </CardTitle>
                <CardDescription className="mt-1">{selected.agency}</CardDescription>
                {selected.division && <p className="text-sm text-muted-foreground mt-0.5">{selected.division}</p>}
              </div>
              <a href={selected.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                Visit Website <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
                    <p className="text-sm">{selected.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                    {selected.phones.map((p, i) => (
                      <a key={i} href={`tel:${p.replace(/\D/g, '')}`} className="block text-sm text-primary hover:underline">{p}</a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {selected.fax && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fax</p>
                      <p className="text-sm">{selected.fax}</p>
                    </div>
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                      {selected.email.startsWith('http') ? (
                        <a href={selected.email} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Contact Form</a>
                      ) : (
                        <a href={`mailto:${selected.email}`} className="text-sm text-primary hover:underline">{selected.email}</a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedState && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Select a state above to view its income tax withholding agency contact information.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
